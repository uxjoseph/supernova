/**
 * PostHog Analytics Events
 * 
 * 이 파일은 모든 PostHog 이벤트 이름과 속성을 중앙에서 관리합니다.
 */

// 이벤트 이름 enum
export enum AnalyticsEvent {
  // 사용자 인증
  SIGNUP = 'signup',
  
  // 프로젝트 관리
  PROJECT_CREATED = 'project_created',
  
  // 생성 이벤트 (북극성 이벤트)
  FIRST_GENERATION_DONE = 'first_generation_done',
  
  // 공유 및 Export
  PAGE_EXPORTED_OR_SHARED = 'page_exported_or_shared',
  
  // 재방문
  RETURN_VISIT = 'return_visit',
}

// 이벤트 속성 타입 정의
export interface SignupEventProps {
  provider: 'google' | 'email';
  user_id: string;
  email?: string;
}

export interface ProjectCreatedEventProps {
  project_id: string;
  project_name: string;
  user_id: string;
}

export interface FirstGenerationDoneEventProps {
  project_id: string;
  model_type: 'fast' | 'quality';
  has_images: boolean;
  prompt_length: number;
  generation_time_ms: number;
  user_id: string;
  is_first_generation: boolean;
}

export interface PageExportedOrSharedEventProps {
  project_id: string;
  node_id: string;
  action: 'exported' | 'shared' | 'published';
  export_type?: 'html' | 'zip' | 'image';
  user_id: string;
}

export interface ReturnVisitEventProps {
  user_id: string;
  days_since_last_visit: number;
  total_projects: number;
  last_project_id?: string;
}

