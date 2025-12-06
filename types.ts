
export enum Role {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface FileArtifact {
  id: string;
  path: string;
  type: 'new' | 'modified' | 'deleted';
  language: string;
  linesAdded?: number;
  status: 'pending' | 'generating' | 'completed';
}

export interface ThinkingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
  duration?: number;
}

// 생성 과정의 각 단계를 나타내는 섹션
export interface GenerationSection {
  id: string;
  type: 'thinking' | 'action' | 'files' | 'result';
  label: string;
  status: 'pending' | 'active' | 'completed';
  duration?: number;
  isExpanded?: boolean;
  files?: FileArtifact[];
  resultSummary?: string;
  features?: string[];
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  imageUrl?: string;
  imageUrls?: string[]; // 여러 장의 참조 이미지
  isThinking?: boolean;
  thinkingSteps?: ThinkingStep[];
  files?: FileArtifact[];
  intent?: string;
  // 새로운 생성 UI를 위한 필드
  generationSections?: GenerationSection[];
  componentTitle?: string;
}

export type NodeType = 'component' | 'image' | 'note';

export interface DesignNode {
  id: string;
  type: NodeType;
  title: string;
  html?: string;     // for component
  imageUrl?: string; // for image
  content?: string;  // for note
  color?: string;    // for note background
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesignState {
  nodes: DesignNode[];
  version: number;
  isLoading: boolean;
}

export type ViewMode = 'desktop' | 'tablet' | 'mobile';

export interface PreviewTab {
  id: string;
  nodeId: string;
  title: string;
}

export interface VariantState {
  isActive: boolean;
  baseNodeId: string | null;
  baseNodeTitle?: string;
}

// 변종 만들기 관련 타입
export interface VariantCreationState {
  isActive: boolean;
  sourceNodeId: string | null;
  sourceNodeTitle: string;
  sourceNodeHtml: string;
}

// 선택된 요소 정보 (AI 수정용)
export interface SelectedElement {
  id: string;
  nodeId: string;
  tagName: string;
  text: string;
  className?: string;
  outerHtml?: string;
}

export const VARIANT_QUICK_TAGS = [
  { id: 'dark', label: '다크 테마', prompt: '다크 모드 테마로 변경해주세요. 배경은 어둡게, 텍스트는 밝게.' },
  { id: 'minimal', label: '미니멀 스타일', prompt: '더 미니멀하고 심플한 스타일로 변경해주세요. 불필요한 요소를 제거하고 여백을 살려주세요.' },
  { id: 'fancy', label: '더 화려하게', prompt: '더 화려하고 역동적인 효과를 추가해주세요. 그라디언트, 애니메이션, 그림자 효과를 사용해주세요.' },
  { id: 'mobile', label: '모바일 최적화', prompt: '모바일에 최적화된 레이아웃으로 변경해주세요. 세로 스크롤에 적합하게.' },
  { id: 'gradient', label: '그라디언트', prompt: '그라디언트 배경과 요소를 활용해주세요. 부드러운 색상 전환 효과.' },
  { id: 'glassmorphism', label: '글래스모피즘', prompt: '글래스모피즘 효과를 적용해주세요. 반투명 배경, 블러, 미묘한 테두리.' },
] as const;
