import { useCallback } from 'react';
import { usePostHog } from 'posthog-js/react';
import { useAuth } from '../contexts/AuthContext';
import {
  AnalyticsEvent,
  SignupEventProps,
  ProjectCreatedEventProps,
  FirstGenerationDoneEventProps,
  PageExportedOrSharedEventProps,
  ReturnVisitEventProps,
} from '../lib/analytics';

/**
 * PostHog 분석 이벤트를 추적하는 커스텀 훅
 */
export const useAnalytics = () => {
  const posthog = usePostHog();
  const { user } = useAuth();

  // 회원가입 이벤트
  const trackSignup = useCallback((props: SignupEventProps) => {
    if (!posthog) return;
    
    posthog.capture(AnalyticsEvent.SIGNUP, props);
    
    // 사용자 식별
    posthog.identify(props.user_id, {
      email: props.email,
      provider: props.provider,
    });
    
    console.log('[Analytics] Signup tracked:', props);
  }, [posthog]);

  // 프로젝트 생성 이벤트
  const trackProjectCreated = useCallback((props: ProjectCreatedEventProps) => {
    if (!posthog) return;
    
    posthog.capture(AnalyticsEvent.PROJECT_CREATED, props);
    console.log('[Analytics] Project created tracked:', props);
  }, [posthog]);

  // 첫 생성 완료 이벤트 (북극성 지표)
  const trackFirstGenerationDone = useCallback((props: FirstGenerationDoneEventProps) => {
    if (!posthog) return;
    
    posthog.capture(AnalyticsEvent.FIRST_GENERATION_DONE, props);
    console.log('[Analytics] First generation done tracked:', props);
  }, [posthog]);

  // 페이지 Export/공유 이벤트
  const trackPageExportedOrShared = useCallback((props: PageExportedOrSharedEventProps) => {
    if (!posthog) return;
    
    posthog.capture(AnalyticsEvent.PAGE_EXPORTED_OR_SHARED, props);
    console.log('[Analytics] Page exported or shared tracked:', props);
  }, [posthog]);

  // 재방문 이벤트
  const trackReturnVisit = useCallback((props: ReturnVisitEventProps) => {
    if (!posthog) return;
    
    posthog.capture(AnalyticsEvent.RETURN_VISIT, props);
    console.log('[Analytics] Return visit tracked:', props);
  }, [posthog]);

  // 사용자 속성 업데이트
  const updateUserProperties = useCallback((properties: Record<string, any>) => {
    if (!posthog || !user) return;
    
    posthog.identify(user.id, properties);
    console.log('[Analytics] User properties updated:', properties);
  }, [posthog, user]);

  return {
    trackSignup,
    trackProjectCreated,
    trackFirstGenerationDone,
    trackPageExportedOrShared,
    trackReturnVisit,
    updateUserProperties,
  };
};

