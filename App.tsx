import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { EditorPage } from './pages/EditorPage';
import { SettingsPage } from './pages/SettingsPage';
import { PublishedPage } from './pages/PublishedPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { ModelType } from './services/geminiService';

type Page = 'landing' | 'editor' | 'settings' | 'published' | 'privacy' | 'terms';

interface EditorState {
  id: string; // 고유 세션 ID
  prompt: string;
  images: string[];
  projectId?: string;
  modelType?: ModelType;
}

// Simple URL-based routing helper
const getRouteFromUrl = (): { page: Page; slug?: string } => {
  const path = window.location.pathname;
  
  // Check for published page route: /p/:slug
  if (path.startsWith('/p/')) {
    const slug = path.substring(3); // Remove '/p/'
    if (slug) {
      return { page: 'published', slug };
    }
  }
  
  // Check for privacy policy route
  if (path === '/privacy') {
    return { page: 'privacy' };
  }
  
  // Check for terms of service route
  if (path === '/terms') {
    return { page: 'terms' };
  }
  
  return { page: 'landing' };
};

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  // Handle URL-based routing on initial load and popstate
  useEffect(() => {
    const handleRoute = () => {
      const route = getRouteFromUrl();
      if (route.page === 'published' && route.slug) {
        setCurrentPage('published');
        setPublishedSlug(route.slug);
      } else if (route.page === 'privacy') {
        setCurrentPage('privacy');
      } else if (route.page === 'terms') {
        setCurrentPage('terms');
      } else {
        setCurrentPage('landing');
      }
    };

    // Initial route check
    handleRoute();

    // Listen for browser back/forward
    window.addEventListener('popstate', handleRoute);
    return () => window.removeEventListener('popstate', handleRoute);
  }, []);

  const handleNavigateToEditor = (prompt: string, images?: string[], projectId?: string, modelType?: ModelType) => {
    setEditorState({
      id: `editor-${Date.now()}`, // 고유 세션 ID로 재마운트 방지
      prompt,
      images: images || [],
      projectId,
      modelType
    });
    setCurrentPage('editor');
    // Update URL without /p/
    window.history.pushState({}, '', '/');
  };

  const handleNavigateToLanding = () => {
    setCurrentPage('landing');
    setEditorState(null);
    setPublishedSlug(null);
    // Update URL to root
    window.history.pushState({}, '', '/');
  };

  const handleNavigateToSettings = () => {
    setCurrentPage('settings');
  };

  const handleNavigateToPrivacy = () => {
    setCurrentPage('privacy');
    window.history.pushState({}, '', '/privacy');
  };

  const handleNavigateToTerms = () => {
    setCurrentPage('terms');
    window.history.pushState({}, '', '/terms');
  };

  // Privacy Policy page
  if (currentPage === 'privacy') {
    return <PrivacyPolicyPage onNavigateBack={handleNavigateToLanding} />;
  }

  // Terms of Service page
  if (currentPage === 'terms') {
    return <TermsOfServicePage onNavigateBack={handleNavigateToLanding} />;
  }

  // Published page (public access)
  if (currentPage === 'published' && publishedSlug) {
    return (
      <PublishedPage 
        slug={publishedSlug} 
        onNavigateHome={handleNavigateToLanding}
      />
    );
  }

  if (currentPage === 'landing') {
    return (
      <LandingPage 
        onNavigateToEditor={handleNavigateToEditor}
        onNavigateToPrivacy={handleNavigateToPrivacy}
        onNavigateToTerms={handleNavigateToTerms}
      />
    );
  }

  if (currentPage === 'settings') {
    return <SettingsPage onNavigateBack={handleNavigateToLanding} />;
  }

  return (
    <EditorPage 
      key={editorState?.id || editorState?.projectId || 'new-editor'}
      initialPrompt={editorState?.prompt}
      initialImages={editorState?.images}
      initialProjectId={editorState?.projectId}
      initialModelType={editorState?.modelType}
      onNavigateBack={handleNavigateToLanding}
    />
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
