import React from 'react';
import { Sparkles, Zap, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PLAN_CONFIG } from '../types/database';

interface CreditDisplayProps {
  variant?: 'compact' | 'full';
  showUpgrade?: boolean;
  onUpgradeClick?: () => void;
}

export const CreditDisplay: React.FC<CreditDisplayProps> = ({
  variant = 'compact',
  showUpgrade = true,
  onUpgradeClick,
}) => {
  const { profile, user } = useAuth();

  // If not logged in, show demo credits
  const credits = profile?.credits_remaining ?? 100;
  const maxCredits = profile?.credits_max ?? 300;
  const planType = profile?.plan_type ?? 'free';
  const planConfig = PLAN_CONFIG[planType];
  const isPro = planType !== 'free';

  const percentage = Math.min((credits / maxCredits) * 100, 100);
  const isLow = percentage < 20;

  // Calculate time until reset for free users
  const getResetTime = () => {
    if (!profile?.credits_reset_at || planType !== 'free') return null;
    const resetDate = new Date(profile.credits_reset_at);
    const now = new Date();
    const diffHours = Math.max(0, Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
    return diffHours;
  };

  const resetHours = getResetTime();

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <Sparkles size={14} className={isPro ? 'text-purple-500' : 'text-gray-400'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">크레딧</span>
            <span className={`font-semibold ${isLow ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
              {credits}
            </span>
          </div>
          <div className="mt-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isLow 
                  ? 'bg-red-500' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isPro ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <Zap size={14} className={isPro ? 'text-purple-500' : 'text-gray-500'} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {planConfig.name}
            </p>
            {isPro && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                PRO
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Credits */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {credits}
          </span>
          <span className="text-sm text-gray-500">/ {maxCredits} 크레딧</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isLow 
                ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Reset time for free users */}
      {resetHours !== null && planType === 'free' && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <Clock size={12} />
          <span>약 {resetHours}시간 후 리셋</span>
        </div>
      )}

      {/* Low credits warning */}
      {isLow && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg mb-3">
          <p className="text-xs text-red-600 dark:text-red-400">
            크레딧이 부족합니다. {isPro ? '다음 달에 충전됩니다.' : '내일 리셋됩니다.'}
          </p>
        </div>
      )}

      {/* Upgrade button for free users */}
      {showUpgrade && !isPro && onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className="w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          Pro로 업그레이드
        </button>
      )}
    </div>
  );
};

export default CreditDisplay;

