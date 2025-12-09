import React, { useState, useEffect } from 'react';
import { Zap, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { getPublishedPage, type PublishedPageWithNode } from '../services/publishService';

interface PublishedPageProps {
  slug: string;
  onNavigateHome?: () => void;
}

export const PublishedPage: React.FC<PublishedPageProps> = ({ slug, onNavigateHome }) => {
  const [page, setPage] = useState<PublishedPageWithNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const publishedPage = await getPublishedPage(slug);
        
        if (!publishedPage) {
          setError('페이지를 찾을 수 없습니다.');
        } else {
          setPage(publishedPage);
        }
      } catch (err: any) {
        console.error('Error loading published page:', err);
        setError('페이지를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      loadPage();
    }
  }, [slug]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">페이지를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            페이지를 찾을 수 없습니다
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {error || '요청하신 페이지가 존재하지 않거나 비공개 상태입니다.'}
          </p>
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Zap size={16} />
            Supernova 홈으로
          </button>
        </div>
      </div>
    );
  }

  // Render the published page
  return (
    <div className="min-h-screen w-full relative">
      {/* Full-screen iframe with the published HTML */}
      <iframe
        srcDoc={page.html_snapshot || ''}
        className="w-full h-screen border-none"
        title={page.title || 'Published Page'}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />

      {/* Supernova Badge - Bottom Right */}
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onNavigateHome?.();
        }}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-black/90 backdrop-blur-sm text-white rounded-full shadow-lg hover:bg-black transition-colors group"
      >
        <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
          <Zap size={12} className="text-black" fill="currentColor" />
        </div>
        <span className="text-xs font-medium">Made with Supernova</span>
        <ExternalLink size={12} className="text-gray-400 group-hover:text-white transition-colors" />
      </a>

      {/* View counter badge - Bottom Left (optional, subtle) */}
      {page.view_count > 0 && (
        <div className="fixed bottom-4 left-4 z-50 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200 text-xs text-gray-500">
          {page.view_count.toLocaleString()} views
        </div>
      )}
    </div>
  );
};

export default PublishedPage;

