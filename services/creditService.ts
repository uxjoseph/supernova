import { 
  CreditState, 
  CreditUsage, 
  CreditUsageType,
  CREDIT_CONFIG,
  TokenUsageMetadata 
} from '../types';

const STORAGE_KEY = 'supernova_credit_state';

// 초기 크레딧 상태 생성
const createInitialState = (): CreditState => {
  const now = Date.now();
  return {
    dailyCredits: CREDIT_CONFIG.DAILY_CREDITS,
    usedCredits: 0,
    remainingCredits: CREDIT_CONFIG.DAILY_CREDITS,
    chatCredits: 0,
    generationCredits: 0,
    resetTime: now + CREDIT_CONFIG.RESET_INTERVAL_MS,
    lastResetTime: now,
    history: [],
  };
};

// 로컬 스토리지에서 상태 로드
const loadState = (): CreditState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored) as CreditState;
      
      // 리셋 시간이 지났는지 확인
      if (Date.now() >= state.resetTime) {
        return resetCredits(state);
      }
      
      return state;
    }
  } catch (e) {
    console.error('Failed to load credit state:', e);
  }
  return createInitialState();
};

// 로컬 스토리지에 상태 저장
const saveState = (state: CreditState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save credit state:', e);
  }
};

// 크레딧 리셋
const resetCredits = (currentState: CreditState): CreditState => {
  const now = Date.now();
  const newState: CreditState = {
    dailyCredits: CREDIT_CONFIG.DAILY_CREDITS,
    usedCredits: 0,
    remainingCredits: CREDIT_CONFIG.DAILY_CREDITS,
    chatCredits: 0,
    generationCredits: 0,
    resetTime: now + CREDIT_CONFIG.RESET_INTERVAL_MS,
    lastResetTime: now,
    history: [], // 히스토리 초기화
  };
  saveState(newState);
  return newState;
};

// 토큰 수를 크레딧으로 변환
export const tokensToCredits = (tokens: number): number => {
  return tokens / CREDIT_CONFIG.TOKENS_PER_CREDIT;
};

// 크레딧을 토큰으로 변환
export const creditsToTokens = (credits: number): number => {
  return credits * CREDIT_CONFIG.TOKENS_PER_CREDIT;
};

// 텍스트의 대략적인 토큰 수 계산 (간단한 추정)
// 실제 토큰화는 API 응답에서 받아옴
export const estimateTokens = (text: string): number => {
  // 한글: 약 1.5 토큰/문자, 영어: 약 0.25 토큰/단어
  // 간단한 근사치 사용
  const koreanChars = (text.match(/[\u3131-\uD79D]/g) || []).length;
  const otherChars = text.length - koreanChars;
  
  return Math.ceil(koreanChars * 1.5 + otherChars * 0.4);
};

// 남은 리셋 시간 계산 (ms)
export const getTimeUntilReset = (state: CreditState): number => {
  const remaining = state.resetTime - Date.now();
  return Math.max(0, remaining);
};

// 남은 리셋 시간을 읽기 쉬운 형식으로 변환
export const formatTimeUntilReset = (state: CreditState): string => {
  const ms = getTimeUntilReset(state);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분 후 리셋`;
  } else if (minutes > 0) {
    return `${minutes}분 후 리셋`;
  } else {
    return '곧 리셋됩니다';
  }
};

// 크레딧 서비스 클래스
class CreditService {
  private state: CreditState;
  private listeners: Set<(state: CreditState) => void> = new Set();

  constructor() {
    this.state = loadState();
    
    // 주기적으로 리셋 체크 (1분마다)
    setInterval(() => {
      this.checkReset();
    }, 60 * 1000);
  }

  // 리셋 체크
  private checkReset(): void {
    if (Date.now() >= this.state.resetTime) {
      this.state = resetCredits(this.state);
      this.notifyListeners();
    }
  }

  // 리스너 알림
  private notifyListeners(): void {
    console.log('[CreditService] Notifying listeners, count:', this.listeners.size);
    console.log('[CreditService] Current state:', this.state);
    this.listeners.forEach(listener => listener(this.state));
  }

  // 상태 변경 구독
  subscribe(listener: (state: CreditState) => void): () => void {
    this.listeners.add(listener);
    console.log('[CreditService] Listener added, total listeners:', this.listeners.size);
    return () => {
      this.listeners.delete(listener);
      console.log('[CreditService] Listener removed, total listeners:', this.listeners.size);
    };
  }

  // 현재 상태 조회
  getState(): CreditState {
    this.checkReset();
    return { ...this.state };
  }

  // 크레딧 충분한지 확인
  hasEnoughCredits(requiredCredits: number): boolean {
    return this.state.remainingCredits >= requiredCredits;
  }

  // 크레딧 차감
  deductCredits(
    type: CreditUsageType,
    tokenUsage: TokenUsageMetadata,
    description: string,
    messageId?: string
  ): CreditUsage | null {
    this.checkReset();

    const creditsUsed = tokensToCredits(tokenUsage.totalTokenCount);
    
    // 크레딧 부족 확인
    if (this.state.remainingCredits < creditsUsed) {
      console.warn('Insufficient credits');
      return null;
    }

    const usage: CreditUsage = {
      id: `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      inputTokens: tokenUsage.promptTokenCount,
      outputTokens: tokenUsage.candidatesTokenCount,
      creditsUsed: Math.round(creditsUsed * 100) / 100, // 소수점 2자리
      description,
      timestamp: Date.now(),
      messageId,
    };

    // 상태 업데이트
    this.state = {
      ...this.state,
      usedCredits: Math.round((this.state.usedCredits + usage.creditsUsed) * 100) / 100,
      remainingCredits: Math.round((this.state.remainingCredits - usage.creditsUsed) * 100) / 100,
      chatCredits: type === 'chat' 
        ? Math.round((this.state.chatCredits + usage.creditsUsed) * 100) / 100 
        : this.state.chatCredits,
      generationCredits: type === 'generation' 
        ? Math.round((this.state.generationCredits + usage.creditsUsed) * 100) / 100 
        : this.state.generationCredits,
      history: [usage, ...this.state.history].slice(0, CREDIT_CONFIG.MAX_HISTORY_ITEMS),
    };

    saveState(this.state);
    
    console.log('[CreditService] Credits deducted:', usage.creditsUsed);
    console.log('[CreditService] New state:', this.state);
    
    this.notifyListeners();

    return usage;
  }

  // 사용 내역 조회
  getUsageHistory(): CreditUsage[] {
    return [...this.state.history];
  }

  // 오늘 사용량 요약
  getTodaySummary(): {
    total: number;
    chat: number;
    generation: number;
    remaining: number;
    percentage: number;
  } {
    return {
      total: this.state.usedCredits,
      chat: this.state.chatCredits,
      generation: this.state.generationCredits,
      remaining: this.state.remainingCredits,
      percentage: Math.round((this.state.usedCredits / this.state.dailyCredits) * 100),
    };
  }

  // 강제 리셋 (개발/테스트용)
  forceReset(): void {
    this.state = createInitialState();
    saveState(this.state);
    this.notifyListeners();
  }
}

// 싱글톤 인스턴스
export const creditService = new CreditService();

// React Hook용 헬퍼 함수들
export const getCreditState = () => creditService.getState();
export const deductCredits = (
  type: CreditUsageType,
  tokenUsage: TokenUsageMetadata,
  description: string,
  messageId?: string
) => creditService.deductCredits(type, tokenUsage, description, messageId);
export const subscribeToCredits = (listener: (state: CreditState) => void) => 
  creditService.subscribe(listener);


  CreditUsage, 
  CreditUsageType,
  CREDIT_CONFIG,
  TokenUsageMetadata 
} from '../types';

const STORAGE_KEY = 'supernova_credit_state';

// 초기 크레딧 상태 생성
const createInitialState = (): CreditState => {
  const now = Date.now();
  return {
    dailyCredits: CREDIT_CONFIG.DAILY_CREDITS,
    usedCredits: 0,
    remainingCredits: CREDIT_CONFIG.DAILY_CREDITS,
    chatCredits: 0,
    generationCredits: 0,
    resetTime: now + CREDIT_CONFIG.RESET_INTERVAL_MS,
    lastResetTime: now,
    history: [],
  };
};

// 로컬 스토리지에서 상태 로드
const loadState = (): CreditState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored) as CreditState;
      
      // 리셋 시간이 지났는지 확인
      if (Date.now() >= state.resetTime) {
        return resetCredits(state);
      }
      
      return state;
    }
  } catch (e) {
    console.error('Failed to load credit state:', e);
  }
  return createInitialState();
};

// 로컬 스토리지에 상태 저장
const saveState = (state: CreditState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save credit state:', e);
  }
};

// 크레딧 리셋
const resetCredits = (currentState: CreditState): CreditState => {
  const now = Date.now();
  const newState: CreditState = {
    dailyCredits: CREDIT_CONFIG.DAILY_CREDITS,
    usedCredits: 0,
    remainingCredits: CREDIT_CONFIG.DAILY_CREDITS,
    chatCredits: 0,
    generationCredits: 0,
    resetTime: now + CREDIT_CONFIG.RESET_INTERVAL_MS,
    lastResetTime: now,
    history: [], // 히스토리 초기화
  };
  saveState(newState);
  return newState;
};

// 토큰 수를 크레딧으로 변환
export const tokensToCredits = (tokens: number): number => {
  return tokens / CREDIT_CONFIG.TOKENS_PER_CREDIT;
};

// 크레딧을 토큰으로 변환
export const creditsToTokens = (credits: number): number => {
  return credits * CREDIT_CONFIG.TOKENS_PER_CREDIT;
};

// 텍스트의 대략적인 토큰 수 계산 (간단한 추정)
// 실제 토큰화는 API 응답에서 받아옴
export const estimateTokens = (text: string): number => {
  // 한글: 약 1.5 토큰/문자, 영어: 약 0.25 토큰/단어
  // 간단한 근사치 사용
  const koreanChars = (text.match(/[\u3131-\uD79D]/g) || []).length;
  const otherChars = text.length - koreanChars;
  
  return Math.ceil(koreanChars * 1.5 + otherChars * 0.4);
};

// 남은 리셋 시간 계산 (ms)
export const getTimeUntilReset = (state: CreditState): number => {
  const remaining = state.resetTime - Date.now();
  return Math.max(0, remaining);
};

// 남은 리셋 시간을 읽기 쉬운 형식으로 변환
export const formatTimeUntilReset = (state: CreditState): string => {
  const ms = getTimeUntilReset(state);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분 후 리셋`;
  } else if (minutes > 0) {
    return `${minutes}분 후 리셋`;
  } else {
    return '곧 리셋됩니다';
  }
};

// 크레딧 서비스 클래스
class CreditService {
  private state: CreditState;
  private listeners: Set<(state: CreditState) => void> = new Set();

  constructor() {
    this.state = loadState();
    
    // 주기적으로 리셋 체크 (1분마다)
    setInterval(() => {
      this.checkReset();
    }, 60 * 1000);
  }

  // 리셋 체크
  private checkReset(): void {
    if (Date.now() >= this.state.resetTime) {
      this.state = resetCredits(this.state);
      this.notifyListeners();
    }
  }

  // 리스너 알림
  private notifyListeners(): void {
    console.log('[CreditService] Notifying listeners, count:', this.listeners.size);
    console.log('[CreditService] Current state:', this.state);
    this.listeners.forEach(listener => listener(this.state));
  }

  // 상태 변경 구독
  subscribe(listener: (state: CreditState) => void): () => void {
    this.listeners.add(listener);
    console.log('[CreditService] Listener added, total listeners:', this.listeners.size);
    return () => {
      this.listeners.delete(listener);
      console.log('[CreditService] Listener removed, total listeners:', this.listeners.size);
    };
  }

  // 현재 상태 조회
  getState(): CreditState {
    this.checkReset();
    return { ...this.state };
  }

  // 크레딧 충분한지 확인
  hasEnoughCredits(requiredCredits: number): boolean {
    return this.state.remainingCredits >= requiredCredits;
  }

  // 크레딧 차감
  deductCredits(
    type: CreditUsageType,
    tokenUsage: TokenUsageMetadata,
    description: string,
    messageId?: string
  ): CreditUsage | null {
    this.checkReset();

    const creditsUsed = tokensToCredits(tokenUsage.totalTokenCount);
    
    // 크레딧 부족 확인
    if (this.state.remainingCredits < creditsUsed) {
      console.warn('Insufficient credits');
      return null;
    }

    const usage: CreditUsage = {
      id: `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      inputTokens: tokenUsage.promptTokenCount,
      outputTokens: tokenUsage.candidatesTokenCount,
      creditsUsed: Math.round(creditsUsed * 100) / 100, // 소수점 2자리
      description,
      timestamp: Date.now(),
      messageId,
    };

    // 상태 업데이트
    this.state = {
      ...this.state,
      usedCredits: Math.round((this.state.usedCredits + usage.creditsUsed) * 100) / 100,
      remainingCredits: Math.round((this.state.remainingCredits - usage.creditsUsed) * 100) / 100,
      chatCredits: type === 'chat' 
        ? Math.round((this.state.chatCredits + usage.creditsUsed) * 100) / 100 
        : this.state.chatCredits,
      generationCredits: type === 'generation' 
        ? Math.round((this.state.generationCredits + usage.creditsUsed) * 100) / 100 
        : this.state.generationCredits,
      history: [usage, ...this.state.history].slice(0, CREDIT_CONFIG.MAX_HISTORY_ITEMS),
    };

    saveState(this.state);
    
    console.log('[CreditService] Credits deducted:', usage.creditsUsed);
    console.log('[CreditService] New state:', this.state);
    
    this.notifyListeners();

    return usage;
  }

  // 사용 내역 조회
  getUsageHistory(): CreditUsage[] {
    return [...this.state.history];
  }

  // 오늘 사용량 요약
  getTodaySummary(): {
    total: number;
    chat: number;
    generation: number;
    remaining: number;
    percentage: number;
  } {
    return {
      total: this.state.usedCredits,
      chat: this.state.chatCredits,
      generation: this.state.generationCredits,
      remaining: this.state.remainingCredits,
      percentage: Math.round((this.state.usedCredits / this.state.dailyCredits) * 100),
    };
  }

  // 강제 리셋 (개발/테스트용)
  forceReset(): void {
    this.state = createInitialState();
    saveState(this.state);
    this.notifyListeners();
  }
}

// 싱글톤 인스턴스
export const creditService = new CreditService();

// React Hook용 헬퍼 함수들
export const getCreditState = () => creditService.getState();
export const deductCredits = (
  type: CreditUsageType,
  tokenUsage: TokenUsageMetadata,
  description: string,
  messageId?: string
) => creditService.deductCredits(type, tokenUsage, description, messageId);
export const subscribeToCredits = (listener: (state: CreditState) => void) => 
  creditService.subscribe(listener);


  CreditUsage, 
  CreditUsageType,
  CREDIT_CONFIG,
  TokenUsageMetadata 
} from '../types';

const STORAGE_KEY = 'supernova_credit_state';

// 초기 크레딧 상태 생성
const createInitialState = (): CreditState => {
  const now = Date.now();
  return {
    dailyCredits: CREDIT_CONFIG.DAILY_CREDITS,
    usedCredits: 0,
    remainingCredits: CREDIT_CONFIG.DAILY_CREDITS,
    chatCredits: 0,
    generationCredits: 0,
    resetTime: now + CREDIT_CONFIG.RESET_INTERVAL_MS,
    lastResetTime: now,
    history: [],
  };
};

// 로컬 스토리지에서 상태 로드
const loadState = (): CreditState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored) as CreditState;
      
      // 리셋 시간이 지났는지 확인
      if (Date.now() >= state.resetTime) {
        return resetCredits(state);
      }
      
      return state;
    }
  } catch (e) {
    console.error('Failed to load credit state:', e);
  }
  return createInitialState();
};

// 로컬 스토리지에 상태 저장
const saveState = (state: CreditState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save credit state:', e);
  }
};

// 크레딧 리셋
const resetCredits = (currentState: CreditState): CreditState => {
  const now = Date.now();
  const newState: CreditState = {
    dailyCredits: CREDIT_CONFIG.DAILY_CREDITS,
    usedCredits: 0,
    remainingCredits: CREDIT_CONFIG.DAILY_CREDITS,
    chatCredits: 0,
    generationCredits: 0,
    resetTime: now + CREDIT_CONFIG.RESET_INTERVAL_MS,
    lastResetTime: now,
    history: [], // 히스토리 초기화
  };
  saveState(newState);
  return newState;
};

// 토큰 수를 크레딧으로 변환
export const tokensToCredits = (tokens: number): number => {
  return tokens / CREDIT_CONFIG.TOKENS_PER_CREDIT;
};

// 크레딧을 토큰으로 변환
export const creditsToTokens = (credits: number): number => {
  return credits * CREDIT_CONFIG.TOKENS_PER_CREDIT;
};

// 텍스트의 대략적인 토큰 수 계산 (간단한 추정)
// 실제 토큰화는 API 응답에서 받아옴
export const estimateTokens = (text: string): number => {
  // 한글: 약 1.5 토큰/문자, 영어: 약 0.25 토큰/단어
  // 간단한 근사치 사용
  const koreanChars = (text.match(/[\u3131-\uD79D]/g) || []).length;
  const otherChars = text.length - koreanChars;
  
  return Math.ceil(koreanChars * 1.5 + otherChars * 0.4);
};

// 남은 리셋 시간 계산 (ms)
export const getTimeUntilReset = (state: CreditState): number => {
  const remaining = state.resetTime - Date.now();
  return Math.max(0, remaining);
};

// 남은 리셋 시간을 읽기 쉬운 형식으로 변환
export const formatTimeUntilReset = (state: CreditState): string => {
  const ms = getTimeUntilReset(state);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분 후 리셋`;
  } else if (minutes > 0) {
    return `${minutes}분 후 리셋`;
  } else {
    return '곧 리셋됩니다';
  }
};

// 크레딧 서비스 클래스
class CreditService {
  private state: CreditState;
  private listeners: Set<(state: CreditState) => void> = new Set();

  constructor() {
    this.state = loadState();
    
    // 주기적으로 리셋 체크 (1분마다)
    setInterval(() => {
      this.checkReset();
    }, 60 * 1000);
  }

  // 리셋 체크
  private checkReset(): void {
    if (Date.now() >= this.state.resetTime) {
      this.state = resetCredits(this.state);
      this.notifyListeners();
    }
  }

  // 리스너 알림
  private notifyListeners(): void {
    console.log('[CreditService] Notifying listeners, count:', this.listeners.size);
    console.log('[CreditService] Current state:', this.state);
    this.listeners.forEach(listener => listener(this.state));
  }

  // 상태 변경 구독
  subscribe(listener: (state: CreditState) => void): () => void {
    this.listeners.add(listener);
    console.log('[CreditService] Listener added, total listeners:', this.listeners.size);
    return () => {
      this.listeners.delete(listener);
      console.log('[CreditService] Listener removed, total listeners:', this.listeners.size);
    };
  }

  // 현재 상태 조회
  getState(): CreditState {
    this.checkReset();
    return { ...this.state };
  }

  // 크레딧 충분한지 확인
  hasEnoughCredits(requiredCredits: number): boolean {
    return this.state.remainingCredits >= requiredCredits;
  }

  // 크레딧 차감
  deductCredits(
    type: CreditUsageType,
    tokenUsage: TokenUsageMetadata,
    description: string,
    messageId?: string
  ): CreditUsage | null {
    this.checkReset();

    const creditsUsed = tokensToCredits(tokenUsage.totalTokenCount);
    
    // 크레딧 부족 확인
    if (this.state.remainingCredits < creditsUsed) {
      console.warn('Insufficient credits');
      return null;
    }

    const usage: CreditUsage = {
      id: `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      inputTokens: tokenUsage.promptTokenCount,
      outputTokens: tokenUsage.candidatesTokenCount,
      creditsUsed: Math.round(creditsUsed * 100) / 100, // 소수점 2자리
      description,
      timestamp: Date.now(),
      messageId,
    };

    // 상태 업데이트
    this.state = {
      ...this.state,
      usedCredits: Math.round((this.state.usedCredits + usage.creditsUsed) * 100) / 100,
      remainingCredits: Math.round((this.state.remainingCredits - usage.creditsUsed) * 100) / 100,
      chatCredits: type === 'chat' 
        ? Math.round((this.state.chatCredits + usage.creditsUsed) * 100) / 100 
        : this.state.chatCredits,
      generationCredits: type === 'generation' 
        ? Math.round((this.state.generationCredits + usage.creditsUsed) * 100) / 100 
        : this.state.generationCredits,
      history: [usage, ...this.state.history].slice(0, CREDIT_CONFIG.MAX_HISTORY_ITEMS),
    };

    saveState(this.state);
    
    console.log('[CreditService] Credits deducted:', usage.creditsUsed);
    console.log('[CreditService] New state:', this.state);
    
    this.notifyListeners();

    return usage;
  }

  // 사용 내역 조회
  getUsageHistory(): CreditUsage[] {
    return [...this.state.history];
  }

  // 오늘 사용량 요약
  getTodaySummary(): {
    total: number;
    chat: number;
    generation: number;
    remaining: number;
    percentage: number;
  } {
    return {
      total: this.state.usedCredits,
      chat: this.state.chatCredits,
      generation: this.state.generationCredits,
      remaining: this.state.remainingCredits,
      percentage: Math.round((this.state.usedCredits / this.state.dailyCredits) * 100),
    };
  }

  // 강제 리셋 (개발/테스트용)
  forceReset(): void {
    this.state = createInitialState();
    saveState(this.state);
    this.notifyListeners();
  }
}

// 싱글톤 인스턴스
export const creditService = new CreditService();

// React Hook용 헬퍼 함수들
export const getCreditState = () => creditService.getState();
export const deductCredits = (
  type: CreditUsageType,
  tokenUsage: TokenUsageMetadata,
  description: string,
  messageId?: string
) => creditService.deductCredits(type, tokenUsage, description, messageId);
export const subscribeToCredits = (listener: (state: CreditState) => void) => 
  creditService.subscribe(listener);

