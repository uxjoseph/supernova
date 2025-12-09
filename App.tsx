import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { EditorPage } from './pages/EditorPage';
import { SettingsPage } from './pages/SettingsPage';

type Page = 'landing' | 'editor' | 'settings';

interface EditorState {
  prompt: string;
  images: string[];
  projectId?: string;
}

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [editorState, setEditorState] = useState<EditorState | null>(null);

  const handleNavigateToEditor = (prompt: string, images?: string[], projectId?: string) => {
    setEditorState({
      prompt,
      images: images || [],
      projectId
    });
    setCurrentPage('editor');
  };

  const handleNavigateToLanding = () => {
    setCurrentPage('landing');
    setEditorState(null);
  };

  const handleNavigateToSettings = () => {
    setCurrentPage('settings');
  };

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
