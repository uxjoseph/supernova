import React, { useState, useEffect } from 'react';
import { Zap, MessageSquare, Layout, Clock, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { CreditState, CreditUsage, CREDIT_CONFIG } from '../types';
import { 
  creditService, 
  formatTimeUntilReset,
  tokensToCredits 
} from '../services/creditService';

interface CreditWidgetProps {
  compact?: boolean;
  onUpgrade?: () => void;
}

export const CreditWidget: React.FC<CreditWidgetProps> = ({ 
  compact = false,
  onUpgrade 
}) => {
  const [state, setState] = useState<CreditState>(creditService.getState());
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState('');

  // 크레딧 상태 구독
  useEffect(() => {
    const unsubscribe = creditService.subscribe(setState);
    return () => unsubscribe();
  }, []);

  // 리셋 시간 업데이트
  useEffect(() => {
    const updateTime = () => {
      setTimeUntilReset(formatTimeUntilReset(state));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60 * 1000); // 1분마다 업데이트
    
    return () => clearInterval(interval);
  }, [state.resetTime]);

  const usagePercentage = (state.usedCredits / state.dailyCredits) * 100;
  const isLowCredits = state.remainingCredits < 20;
  const isCriticalCredits = state.remainingCredits < 10;

  // 컴팩트 모드 (헤더용)
  if (compact) {
    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
          isCriticalCredits 
            ? 'bg-red-50 text-red-600 hover:bg-red-100' 
            : isLowCredits 
              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <Zap size={14} className={isCriticalCredits ? 'text-red-500' : isLowCredits ? 'text-amber-500' : 'text-gray-500'} />
        <span className="text-xs font-semibold tabular-nums">
          {state.remainingCredits.toFixed(1)}
        </span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div 
        className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${
              isCriticalCredits ? 'bg-red-100' : isLowCredits ? 'bg-amber-100' : 'bg-gray-100'
            }`}>
              <Zap size={14} className={
                isCriticalCredits ? 'text-red-600' : isLowCredits ? 'text-amber-600' : 'text-gray-600'
              } />
            </div>
            <span className="text-sm font-semibold text-gray-900">크레딧</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tabular-nums text-gray-900">
              {state.remainingCredits.toFixed(1)}
            </span>
            {isExpanded ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </div>
        </div>

        {/* 프로그레스 바 */}
        <div className="mt-3">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isCriticalCredits 
                  ? 'bg-red-500' 
                  : isLowCredits 
                    ? 'bg-amber-500' 
                    : 'bg-gradient-to-r from-indigo-500 to-violet-500'
              }`}
              style={{ width: `${Math.max(0, 100 - usagePercentage)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-gray-400">
              {state.usedCredits.toFixed(1)} / {state.dailyCredits} 사용됨
            </span>
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <Clock size={10} />
              {timeUntilReset}
            </span>
          </div>
        </div>
      </div>

      {/* 확장 영역 */}
      {isExpanded && (
        <div className="border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
          {/* 사용량 내역 */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-gray-500">
                <MessageSquare size={12} />
                <span>대화 사용</span>
              </div>
              <span className="font-medium text-gray-900 tabular-nums">
                -{state.chatCredits.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-gray-500">
                <Layout size={12} />
                <span>생성 사용</span>
              </div>
              <span className="font-medium text-gray-900 tabular-nums">
                -{state.generationCredits.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 경고 메시지 */}
          {isLowCredits && (
            <div className={`mx-4 mb-3 px-3 py-2 rounded-lg flex items-start gap-2 ${
              isCriticalCredits ? 'bg-red-50' : 'bg-amber-50'
            }`}>
              <AlertTriangle size={14} className={
                isCriticalCredits ? 'text-red-500 mt-0.5' : 'text-amber-500 mt-0.5'
              } />
              <p className={`text-xs ${
                isCriticalCredits ? 'text-red-700' : 'text-amber-700'
              }`}>
                {isCriticalCredits 
                  ? '크레딧이 거의 소진되었습니다. 업그레이드를 고려해주세요.'
                  : '크레딧이 부족합니다. 업그레이드를 고려해주세요.'
                }
              </p>
            </div>
          )}

          {/* 플랜 정보 */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-gray-600">Free Tier</span>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  일일 {CREDIT_CONFIG.DAILY_CREDITS} 크레딧
                </p>
              </div>
              {onUpgrade && (
                <button
                  onClick={onUpgrade}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 rounded-lg transition-all shadow-sm"
                >
                  업그레이드
                </button>
              )}
            </div>
          </div>

          {/* 최근 사용 내역 */}
          {state.history.length > 0 && (
            <div className="border-t border-gray-100">
              <div className="px-4 py-2 bg-gray-50">
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  최근 사용 내역
                </span>
              </div>
              <div className="max-h-[150px] overflow-y-auto">
                {state.history.slice(0, 5).map((usage) => (
                  <UsageHistoryItem key={usage.id} usage={usage} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 사용 내역 아이템
const UsageHistoryItem: React.FC<{ usage: CreditUsage }> = ({ usage }) => {
  const timeAgo = getTimeAgo(usage.timestamp);
  
  return (
    <div className="px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-2">
        <div className={`p-1 rounded ${
          usage.type === 'chat' ? 'bg-blue-50 text-blue-500' : 'bg-violet-50 text-violet-500'
        }`}>
          {usage.type === 'chat' ? <MessageSquare size={10} /> : <Layout size={10} />}
        </div>
        <div>
          <p className="text-xs text-gray-700 truncate max-w-[150px]">
            {usage.description}
          </p>
          <p className="text-[10px] text-gray-400">{timeAgo}</p>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-900 tabular-nums">
        -{usage.creditsUsed.toFixed(2)}
      </span>
    </div>
  );
};

// 시간 경과 표시
const getTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return '방금 전';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
  return `${Math.floor(seconds / 86400)}일 전`;
};

export default CreditWidget;


