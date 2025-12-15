import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UserResult {
  id: string;
  email: string;
  name: string | null;
  credits_remaining: number;
  credits_max: number;
  plan_type: string;
}

interface AdminPricePageProps {
  onNavigateBack: () => void;
}

// 관리자 이메일 목록 (보안을 위해 환경변수로 관리 권장)
const ADMIN_EMAILS = [
  'admin@supernova.com',
  'josh@example.com',
  // 여기에 관리자 이메일 추가
];

export const AdminPricePage: React.FC<AdminPricePageProps> = ({ onNavigateBack }) => {
  const { user, profile } = useAuth();
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<UserResult | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(100);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 관리자 권한 체크 (현재는 모든 로그인 사용자 허용)
  // TODO: 실제 운영 시 특정 이메일이나 role 기반으로 제한 필요
  const isAdmin = !!user;

  // 사용자 검색
  const handleSearchUser = async () => {
    if (!searchEmail.trim() || !isSupabaseConfigured()) {
      setMessage({ type: 'error', text: 'Supabase가 설정되지 않았거나 이메일이 비어있습니다.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setFoundUser(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, credits_remaining, credits_max, plan_type')
        .eq('email', searchEmail.trim().toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setMessage({ type: 'error', text: '해당 이메일의 사용자를 찾을 수 없습니다.' });
        } else {
          setMessage({ type: 'error', text: `검색 오류: ${error.message}` });
        }
        return;
      }

      setFoundUser(data as UserResult);
      setMessage({ type: 'success', text: '사용자를 찾았습니다!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: `오류: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  // 크레딧 충전
  const handleAddCredits = async () => {
    if (!foundUser || creditAmount <= 0) {
      setMessage({ type: 'error', text: '사용자를 선택하고 유효한 충전량을 입력하세요.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const newCredits = foundUser.credits_remaining + creditAmount;
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          credits_remaining: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', foundUser.id);

      if (error) {
        setMessage({ type: 'error', text: `충전 오류: ${error.message}` });
        return;
      }

      // 업데이트된 정보 반영
      setFoundUser({
        ...foundUser,
        credits_remaining: newCredits
      });

      setMessage({ 
        type: 'success', 
        text: `✅ ${creditAmount} 크레딧을 성공적으로 충전했습니다! (현재: ${newCredits})` 
      });
      setCreditAmount(100); // 리셋
    } catch (error: any) {
      setMessage({ type: 'error', text: `오류: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  // 크레딧 직접 설정
  const handleSetCredits = async () => {
    if (!foundUser || creditAmount < 0) {
      setMessage({ type: 'error', text: '사용자를 선택하고 유효한 크레딧 값을 입력하세요.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          credits_remaining: creditAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', foundUser.id);

      if (error) {
        setMessage({ type: 'error', text: `설정 오류: ${error.message}` });
        return;
      }

      setFoundUser({
        ...foundUser,
        credits_remaining: creditAmount
      });

      setMessage({ 
        type: 'success', 
        text: `✅ 크레딧을 ${creditAmount}로 설정했습니다!` 
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: `오류: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  // 권한 없음
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-4">🚫 접근 권한 없음</h1>
          <p className="text-gray-400 mb-6">이 페이지는 관리자만 접근할 수 있습니다.</p>
          <button
            onClick={onNavigateBack}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateBack}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold">🔐 관리자 크레딧 충전</h1>
              <p className="text-sm text-gray-400">사용자 크레딧을 관리합니다</p>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            로그인: {user?.email}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* 사용자 검색 */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🔍</span> 사용자 검색
          </h2>
          
          <div className="flex gap-3">
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
              placeholder="사용자 이메일 입력..."
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              onClick={handleSearchUser}
              disabled={isLoading || !searchEmail.trim()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
            >
              {isLoading ? '검색 중...' : '검색'}
            </button>
          </div>
        </div>

        {/* 메시지 표시 */}
        {message && (
          <div className={`p-4 rounded-xl mb-6 ${
            message.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
              : 'bg-red-500/20 border border-red-500/50 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* 찾은 사용자 정보 */}
        {foundUser && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>👤</span> 사용자 정보
            </h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">이메일</span>
                <span className="font-mono">{foundUser.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">이름</span>
                <span>{foundUser.name || '(없음)'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">플랜</span>
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                  {foundUser.plan_type}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">현재 크레딧</span>
                <span className="text-2xl font-bold text-green-400">
                  {foundUser.credits_remaining} / {foundUser.credits_max}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 크레딧 충전 */}
        {foundUser && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>💳</span> 크레딧 관리
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">크레딧 양</label>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xl font-mono"
              />
            </div>

            {/* 빠른 선택 버튼 */}
            <div className="flex gap-2 mb-6">
              {[50, 100, 300, 500, 1000].map(amount => (
                <button
                  key={amount}
                  onClick={() => setCreditAmount(amount)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    creditAmount === amount 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddCredits}
                disabled={isLoading || creditAmount <= 0}
                className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-colors"
              >
                ➕ {creditAmount} 크레딧 추가
              </button>
              <button
                onClick={handleSetCredits}
                disabled={isLoading || creditAmount < 0}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-colors"
              >
                ✏️ {creditAmount}로 설정
              </button>
            </div>
          </div>
        )}

        {/* 안내 */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>⚠️ 이 페이지는 관리자 전용입니다. 모든 변경 사항은 즉시 적용됩니다.</p>
        </div>
      </main>
    </div>
  );
};

export default AdminPricePage;

