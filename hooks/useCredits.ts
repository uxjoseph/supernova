import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CREDIT_COSTS, PLAN_CONFIG } from '../types/database';

type ActionType = keyof typeof CREDIT_COSTS;

interface UseCreditsReturn {
  credits: number;
  maxCredits: number;
  canExportCode: boolean;
  isLoading: boolean;
  hasEnoughCredits: (action: ActionType) => boolean;
  deductCredits: (action: ActionType, projectId?: string) => Promise<boolean>;
  getCreditCost: (action: ActionType) => number;
  refreshCredits: () => Promise<void>;
}

export const useCredits = (): UseCreditsReturn => {
  const { profile, refreshProfile, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const credits = profile?.credits_remaining ?? 100;
  const maxCredits = profile?.credits_max ?? 300;
  const planType = profile?.plan_type ?? 'free';
  const canExportCode = PLAN_CONFIG[planType]?.canExportCode ?? false;

  const getCreditCost = useCallback((action: ActionType): number => {
    return CREDIT_COSTS[action];
  }, []);

  const hasEnoughCredits = useCallback((action: ActionType): boolean => {
    const cost = getCreditCost(action);
    return credits >= cost;
  }, [credits, getCreditCost]);

  const deductCredits = useCallback(async (
    action: ActionType, 
    projectId?: string
  ): Promise<boolean> => {
    if (!user || !isSupabaseConfigured()) {
      // In demo mode without auth, always allow
      console.log('[Demo] Skipping credit deduction - no auth');
      return true;
    }

    const cost = getCreditCost(action);
    
    if (!hasEnoughCredits(action)) {
      console.warn(`Not enough credits. Need ${cost}, have ${credits}`);
      return false;
    }

    setIsLoading(true);

    try {
      // Use the database function to deduct credits
      const { data, error } = await supabase.rpc('deduct_credits', {
        p_user_id: user.id,
        p_amount: cost,
        p_action: action,
        p_project_id: projectId || null,
      });

      if (error) {
        console.error('Error deducting credits:', error);
        return false;
      }

      // Refresh profile to get updated credits
      await refreshProfile();

      return data === true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, credits, getCreditCost, hasEnoughCredits, refreshProfile]);

  const refreshCredits = useCallback(async () => {
    await refreshProfile();
  }, [refreshProfile]);

  return {
    credits,
    maxCredits,
    canExportCode,
    isLoading,
    hasEnoughCredits,
    deductCredits,
    getCreditCost,
    refreshCredits,
  };
};

// Hook for checking credits before an action
export const useCreditsCheck = () => {
  const { hasEnoughCredits, getCreditCost, credits } = useCredits();

  const checkCredits = useCallback((action: ActionType): { 
    allowed: boolean; 
    cost: number; 
    remaining: number;
    message: string;
  } => {
    const cost = getCreditCost(action);
    const allowed = hasEnoughCredits(action);

    return {
      allowed,
      cost,
      remaining: credits,
      message: allowed 
        ? `이 작업에 ${cost} 크레딧이 필요합니다.` 
        : `크레딧이 부족합니다. 필요: ${cost}, 보유: ${credits}`,
    };
  }, [hasEnoughCredits, getCreditCost, credits]);

  return { checkCredits };
};

export default useCredits;

