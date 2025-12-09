import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { EditorPage } from './pages/EditorPage';
import { SettingsPage } from './pages/SettingsPage';
import { PublishedPage } from './pages/PublishedPage';

type Page = 'landing' | 'editor' | 'settings' | 'published';

interface EditorState {
  prompt: string;
  images: string[];
  projectId?: string;
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
      }
    };

    // Initial route check
    handleRoute();

    // Listen for browser back/forward
    window.addEventListener('popstate', handleRoute);
    return () => window.removeEventListener('popstate', handleRoute);
  }, []);

  const handleNavigateToEditor = (prompt: string, images?: string[], projectId?: string) => {
    setEditorState({
      prompt,
      images: images || [],
      projectId
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
    return <LandingPage onNavigateToEditor={handleNavigateToEditor} />;
  }

  if (currentPage === 'settings') {
    return <SettingsPage onNavigateBack={handleNavigateToLanding} />;
  }

  return (
    <EditorPage 
      key={editorState?.projectId || editorState?.prompt || 'new-editor'}
      initialPrompt={editorState?.prompt}
      initialImages={editorState?.images}
      initialProjectId={editorState?.projectId}
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
