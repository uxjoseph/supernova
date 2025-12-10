import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Image as ImageIcon, Paperclip, Moon, Sun, Globe, X, Zap, Sparkles, LogIn, Loader2 } from 'lucide-react';
import { Language, detectLanguage, getTranslation } from '../i18n';
import logoLight from '../img/logo_lightmode.png';
import logoDark from '../img/logo_darkmode.png';
import { AuthButton } from '../components/AuthButton';
import { UserMenu } from '../components/UserMenu';
import { useAuth } from '../contexts/AuthContext';
import { MyProjectsSection } from '../components/MyProjectsSection';
import { ModelType } from '../services/geminiService';

interface LandingPageProps {
  onNavigateToEditor: (prompt: string, images?: string[], projectId?: string, modelType?: ModelType) => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToEditor, onNavigateToPrivacy, onNavigateToTerms }) => {
  const { user, isLoading: authLoading, signInWithGoogle, isConfigured } = useAuth();
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  const [lang, setLang] = useState<Language>('ko');
  const t = getTranslation(lang);
  
  const [input, setInput] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelType>('fast');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const detectedLang = detectLanguage();
    setLang(detectedLang);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const toggleLanguage = () => setLang(prev => prev === 'ko' ? 'en' : 'ko');

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    
    // 로그인 체크
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    onNavigateToEditor(input.trim(), referenceImages, undefined, selectedModel);
  };

  const handleLoginFromModal = async () => {
    if (!isConfigured) {
      alert('Supabase가 아직 설정되지 않았습니다.');
      return;
    }

    try {
      setIsSigningIn(true);
      await signInWithGoogle();
      setShowLoginModal(false);
    } catch (error) {
      console.error('Sign in error:', error);
      alert('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setReferenceImages(prev => [...prev, imageUrl]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Handle paste event for images (supports multiple)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    let imageFound = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Check if the item is an image
      if (item.type.startsWith('image/')) {
        imageFound = true;
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setReferenceImages(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
    
    // Prevent default only if we found at least one image
    if (imageFound) {
      e.preventDefault();
    }
  };

  // Handle drag and drop for images
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setReferenceImages(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTagClick = (tag: string) => {
    setInput(tag);
    // textarea에 포커스
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleOpenProject = (projectId: string) => {
    onNavigateToEditor('', [], projectId);
  };

  const handleCreateNew = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-200 relative overflow-hidden">
      
      {/* Aurora Background Effect */}
      <div className="absolute top-0 left-0 w-full h-[800px] overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-purple-200 dark:bg-purple-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] opacity-40 animate-blob"></div>
        <div className="absolute top-[-10%] right-[20%] w-[400px] h-[400px] bg-indigo-200 dark:bg-indigo-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] opacity-40 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] left-[40%] w-[600px] h-[600px] bg-pink-100 dark:bg-pink-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-40 animate-blob" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-0 w-full h-full bg-gradient-to-b from-transparent to-white dark:to-black"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/60 dark:bg-black/60 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50 transition-all duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={logoLight} alt="Supanova" className="h-8 w-auto dark:hidden" />
              <img src={logoDark} alt="Supanova" className="h-8 w-auto hidden dark:block" />
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Globe size={16} />
                <span className="text-xs font-medium uppercase">{lang === 'ko' ? 'EN' : 'KO'}</span>
              </button>
              <button 
                onClick={toggleTheme}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              {/* Auth Section - 로딩 중에도 항상 표시 */}
              {user ? (
                <UserMenu />
              ) : (
                <AuthButton variant="outline" size="sm" />
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-screen">
        
        {/* Hero Section */}
        <div className="text-center mb-12 relative w-full">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 mb-6 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t.hero.badge}</span>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-gray-900 dark:text-white leading-[1.1]">
            <motion.span
              key={`title1-${lang}`}
              className="block"
              initial={{ opacity: 0, filter: "blur(15px)", y: 30 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {t.hero.title1}
            </motion.span>
            <motion.span 
              key={`title2-${lang}`}
              className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 pb-2"
              initial={{ opacity: 0, filter: "blur(15px)", y: 30 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            >
              {t.hero.title2}
            </motion.span>
          </h1>
          
          {/* Description */}
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-lg mx-auto mb-10 font-normal leading-relaxed">
            {t.hero.description}<br className="hidden md:block"/>
            {t.hero.description2}
          </p>

          {/* Prompt Input */}
          <div className="w-full max-w-2xl mx-auto">
            <div 
              className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 focus-within:ring-2 focus-within:ring-gray-900/5 dark:focus-within:ring-white/10 focus-within:border-gray-300 dark:focus-within:border-gray-700 transition-all duration-200 shadow-lg"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              
              <div className="p-4">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={t.hero.placeholder}
                  className="w-full resize-none outline-none text-base text-gray-900 dark:text-white placeholder-gray-400 bg-transparent min-h-[56px] max-h-[200px] leading-relaxed"
                  rows={1}
                />
                
                {/* Reference Images Preview */}
                {referenceImages.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {referenceImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img src={img} alt={`Reference ${index + 1}`} className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                        <button 
                          onClick={() => setReferenceImages(prev => prev.filter((_, i) => i !== index))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-4 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* 이미지 업로드 버튼 */}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    title="참조 이미지 추가"
                  >
                    <ImageIcon size={18} />
                  </button>
                  <input 
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {/* 구분선 */}
                  <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
                  
                  {/* 모델 선택 토글 */}
                  <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                    <button
                      onClick={() => setSelectedModel('fast')}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                        ${selectedModel === 'fast' 
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}
                      `}
                    >
                      <Zap size={14} />
                      <span>Flash</span>
                    </button>
                    <button
                      onClick={() => setSelectedModel('pro')}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                        ${selectedModel === 'pro' 
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}
                      `}
                    >
                      <Sparkles size={14} />
                      <span>Pro</span>
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className={`
                    h-9 w-9 flex items-center justify-center rounded-lg transition-all duration-200
                    ${input.trim() 
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-black hover:scale-105' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'}
                  `}
                >
                  <ArrowUp size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            
            {/* Quick Tags */}
            <div className="mt-5 flex justify-center gap-2 text-sm">
              <button 
                onClick={() => handleTagClick('포트폴리오 웹사이트')}
                className="px-4 py-2 rounded-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                {t.tags.portfolio}
              </button>
              <button 
                onClick={() => handleTagClick('쇼핑몰 랜딩페이지')}
                className="px-4 py-2 rounded-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                {t.tags.shopping}
              </button>
              <button 
                onClick={() => handleTagClick('스타트업 랜딩페이지')}
                className="px-4 py-2 rounded-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                {t.tags.startup}
              </button>
            </div>
          </div>

        </div>

        {/* My Projects Section */}
        {user && (
          <MyProjectsSection 
            onOpenProject={handleOpenProject}
            onCreateNew={handleCreateNew}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 py-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <button
            onClick={onNavigateToPrivacy}
            className="text-[11px] text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors underline-offset-2 hover:underline"
          >
            개인정보처리방침
          </button>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <button
            onClick={onNavigateToTerms}
            className="text-[11px] text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors underline-offset-2 hover:underline"
          >
            이용약관
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          {t.footer.copyright}
        </p>
      </footer>

      {/* Login Required Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <LogIn size={20} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    로그인이 필요해요
                  </h3>
                </div>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                AI 랜딩페이지를 생성하려면 먼저 로그인해주세요. 
                Google 계정으로 간편하게 시작할 수 있어요.
              </p>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleLoginFromModal}
                  disabled={isSigningIn}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {isSigningIn ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Google로 계속하기</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowLoginModal(false)}
                  className="w-full py-2.5 px-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  나중에 할게요
                </button>
              </div>

              {/* Footer note */}
              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-4">
                로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS Animation for blob */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
      `}</style>
    </div>
  );
};

