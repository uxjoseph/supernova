import React, { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { EditorPage } from './pages/EditorPage';

type Page = 'landing' | 'editor';

interface EditorState {
  prompt: string;
  images: string[];
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [editorState, setEditorState] = useState<EditorState | null>(null);

  const handleNavigateToEditor = (prompt: string, images?: string[]) => {
    setEditorState({
      prompt,
      images: images || []
    });
    setCurrentPage('editor');
  };

  const handleNavigateBack = () => {
    setCurrentPage('landing');
    setEditorState(null);
  };

  if (currentPage === 'landing') {
    return <LandingPage onNavigateToEditor={handleNavigateToEditor} />;
  }

  return (
    <EditorPage 
      key={editorState?.prompt || 'editor'}
      initialPrompt={editorState?.prompt}
      initialImages={editorState?.images}
      onNavigateBack={handleNavigateBack}
    />
  );
};

export default App;
