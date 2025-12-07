import React from 'react';
import { ArrowLeft, Sparkles, Check, X, Clock, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PLAN_CONFIG } from '../types/database';

interface SettingsPageProps {
  onNavigateBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigateBack }) => {
  const { profile, user } = useAuth();

  const credits = profile?.credits_remaining ?? 100;
  const maxCredits = profile?.credits_max ?? 300;
  const planType = profile?.plan_type ?? 'free';
  const isPro = planType !== 'free';

  // Calculate reset time for free users
  const getResetTime = () => {
    if (!profile?.credits_reset_at || planType !== 'free') return null;
    const resetDate = new Date(profile.credits_reset_at);
    const now = new Date();
    const diffHours = Math.max(0, Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
    return diffHours;
  };

  const resetHours = getResetTime();

  const handleGetStarted = (plan: 'pro_monthly' | 'pro_annual') => {
    // TODO: Implement payment flow
    alert(`${plan === 'pro_monthly' ? 'Monthly' : 'Annual'} 결제 기능은 곧 추가될 예정입니다.`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={onNavigateBack}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Supernova</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Credit Overview */}
        <div className="mb-12 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={20} className="text-purple-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Credit Overview</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Monitor your balance and purchase additional credits
          </p>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl font-bold text-gray-900 dark:text-white">{credits}</span>
            <span className="text-lg text-gray-500">credits</span>
          </div>

          <div className="flex items-center gap-4">
            <span className={`text-sm font-medium ${isPro ? 'text-purple-600' : 'text-gray-600 dark:text-gray-400'}`}>
              {isPro ? 'Pro Plan' : 'Free Tier'}
            </span>
            {resetHours !== null && planType === 'free' && (
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <Clock size={14} />
                Resets in about {resetHours} hours
              </span>
            )}
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Subscription Plans</h2>
          <p className="text-gray-500 dark:text-gray-400">Choose the plan that works best for you</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div className="relative p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Free</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Good for indie exploration</p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">100 credits per day, 300 max</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <X size={16} className="text-gray-400" />
                <span className="text-gray-500">No code exports</span>
              </div>
            </div>

            {planType === 'free' ? (
              <button
                disabled
                className="w-full py-2.5 px-4 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : (
              <button
                className="w-full py-2.5 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Downgrade
              </button>
            )}
          </div>

          {/* Pro Monthly */}
          <div className="relative p-6 bg-white dark:bg-gray-900 border-2 border-gray-900 dark:border-white rounded-2xl">
            {/* Most Popular Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded-full">
                Most Popular
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Professional (Monthly)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Full power design agent</p>

            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">$20</span>
              <span className="text-gray-500">/month</span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">1,500 credits per month</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">Unlimited code exports</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">Priority support</span>
              </div>
            </div>

            {planType === 'pro_monthly' ? (
              <button
                disabled
                className="w-full py-2.5 px-4 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => handleGetStarted('pro_monthly')}
                className="w-full py-2.5 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                Get Started
              </button>
            )}
          </div>

          {/* Pro Annual */}
          <div className="relative p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Professional (Annual)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Full power design agent</p>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">$199</span>
              <span className="text-gray-500">/year</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-6">Save $40/year</p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">18,000 credits per year (1,500 per month)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">Unlimited code exports</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">Priority support</span>
              </div>
            </div>

            {planType === 'pro_annual' ? (
              <button
                disabled
                className="w-full py-2.5 px-4 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => handleGetStarted('pro_annual')}
                className="w-full py-2.5 px-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Get Started
              </button>
            )}
          </div>
        </div>

        {/* Credit Usage Info */}
        <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">크레딧 사용량</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl">
              <span className="text-sm text-gray-600 dark:text-gray-400">랜딩페이지 생성</span>
              <span className="font-semibold text-gray-900 dark:text-white">10 크레딧</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl">
              <span className="text-sm text-gray-600 dark:text-gray-400">변종 생성</span>
              <span className="font-semibold text-gray-900 dark:text-white">5 크레딧</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl">
              <span className="text-sm text-gray-600 dark:text-gray-400">요소 수정</span>
              <span className="font-semibold text-gray-900 dark:text-white">2 크레딧</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;

