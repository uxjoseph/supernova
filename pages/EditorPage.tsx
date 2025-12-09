import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Canvas } from '../components/Canvas';
import { PanelLeftOpen, ArrowLeft, Cloud, CloudOff, Check } from 'lucide-react';
import { Message, Role, DesignNode, FileArtifact, GenerationSection, VariantCreationState, PreviewTab, SelectedElement } from '../types';
import { generateDesignStream, extractHtml, ModelType, StreamResult } from '../services/geminiService';
// 크레딧 관리는 useCredits 훅을 통해 Supabase에서 처리
import { useProject } from '../hooks/useProject';
import { useCredits } from '../hooks/useCredits';
import { useAuth } from '../contexts/AuthContext';

interface EditorPageProps {
  initialPrompt?: string;
  initialImages?: string[];
  initialProjectId?: string;
  onNavigateBack: () => void;
}

export const EditorPage: React.FC<EditorPageProps> = ({ 
  initialPrompt, 
  initialImages = [],
  initialProjectId,
  onNavigateBack 
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const isResizing = useRef(false);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const hasInitializedRef = useRef(false);

  // Auth and project hooks
  const { user, isConfigured } = useAuth();
  const { 
    project, 
    createProject, 
    loadProject,
    updateProjectName, 
    updateProjectThumbnail,
    saveNode, 
    saveNodes, 
    saveNodeImmediate,
    deleteNode: deleteNodeFromDb,
    loadNodes,
    isSaving,
    lastSaved,
    setProject,
    saveMessage,
    loadMessages,
    updateMessage
  } = useProject();
  const { deductCredits: deductSupabaseCredits, hasEnoughCredits, refreshCredits } = useCredits();
  
  // 프로젝트 ID를 저장하는 ref (비동기 작업에서 사용)
  const projectIdRef = useRef<string | null>(initialProjectId || null);
  const projectCreatingRef = useRef(false);

  // Initialize or load project on mount
  useEffect(() => {
    const initProject = async () => {
      // 기존 프로젝트 열기
      if (initialProjectId) {
        console.log('[EditorPage] Loading existing project:', initialProjectId);
        projectIdRef.current = initialProjectId;
        await loadProject(initialProjectId);
        return;
      }
      
      // 새 프로젝트 생성
      if (user && isConfigured && !project && !projectCreatingRef.current) {
        projectCreatingRef.current = true;
        const newProject = await createProject(projectName);
        if (newProject) {
          projectIdRef.current = newProject.id;
          console.log('[EditorPage] Project created:', newProject.id);
        }
        projectCreatingRef.current = false;
      }
    };
    initProject();
  }, [user, isConfigured, initialProjectId]);
  
  // project 변경 시 이름과 ref 업데이트
  useEffect(() => {
    if (project) {
      projectIdRef.current = project.id;
      setProjectName(project.name);
      console.log('[EditorPage] Project loaded:', project.id, project.name);
    }
  }, [project]);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = e.clientX;
      if (newWidth >= 260 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: Role.MODEL,
      content: "디자인할 준비가 되었습니다. 만들고 싶은 페이지를 설명해주세요.",
      timestamp: Date.now()
    }
  ]);
  const [nodes, setNodes] = useState<DesignNode[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState<{id: string, timestamp: number} | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(!!initialProjectId);
  const nodesLoadedRef = useRef(false);
  
  // 기존 프로젝트 노드 및 메시지 로드 - 처음 한 번만 실행
  useEffect(() => {
    // 이미 로드했으면 스킵
    if (nodesLoadedRef.current) return;
    
    if (project && initialProjectId && project.id === initialProjectId) {
      nodesLoadedRef.current = true;
      console.log('[EditorPage] Loading data for project:', project.id);
      setIsLoadingProject(true);
      setIsGenerating(false); // 명시적으로 false로 설정
      
      // 노드와 메시지를 동시에 로드
      Promise.all([loadNodes(), loadMessages()]).then(([loadedNodes, loadedMessages]) => {
        console.log('[EditorPage] Loaded nodes:', loadedNodes.length);
        console.log('[EditorPage] Loaded messages:', loadedMessages.length);
        
        setNodes(loadedNodes);
        
        // 메시지가 있으면 로드, 없으면 기본 메시지 유지
        if (loadedMessages.length > 0) {
          // isThinking이 true인 미완료 메시지는 false로 변경
          const cleanedMessages = loadedMessages.map(msg => ({
            ...msg,
            isThinking: false
          }));
          setMessages(cleanedMessages);
        }
        
        setIsLoadingProject(false);
      }).catch(err => {
        console.error('[EditorPage] Error loading project data:', err);
        setIsLoadingProject(false);
        setIsGenerating(false);
      });
    }
  }, [project, initialProjectId, loadNodes, loadMessages]);
  
  // 변종 만들기 상태
  const [variantState, setVariantState] = useState<VariantCreationState>({
    isActive: false,
    sourceNodeId: null,
    sourceNodeTitle: '',
    sourceNodeHtml: ''
  });

  // 미리보기 탭 상태
  const [previewTabs, setPreviewTabs] = useState<PreviewTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('canvas');

  // 선택된 요소 상태
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);

  // Helper to update generation sections
  const updateSection = (msgId: string, sectionId: string, updates: Partial<GenerationSection>) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== msgId) return msg;
      const sections = msg.generationSections || [];
      return {
        ...msg,
        generationSections: sections.map(s => s.id === sectionId ? { ...s, ...updates } : s)
      };
    }));
  };

  const updateFileInSection = (msgId: string, sectionId: string, fileId: string, updates: Partial<FileArtifact>) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== msgId) return msg;
      const sections = msg.generationSections || [];
      return {
        ...msg,
        generationSections: sections.map(s => {
          if (s.id !== sectionId) return s;
          const files = s.files || [];
          return { ...s, files: files.map(f => f.id === fileId ? { ...f, ...updates } : f) };
        })
      };
    }));
  };

  const extractComponentTitle = (content: string): string => {
    const keywords = ['랜딩', '대시보드', '로그인', '프로필', '설정', '결제', '상품', '카드', '포트폴리오', '쇼핑몰', '스타트업'];
    const found = keywords.find(k => content.includes(k));
    if (found) {
      const titles: Record<string, string> = {
        '랜딩': 'Landing Page',
        '대시보드': 'Dashboard',
        '로그인': 'Login Page',
        '프로필': 'Profile Page',
        '설정': 'Settings Page',
        '결제': 'Checkout Page',
        '상품': 'Product Page',
        '카드': 'Card Component',
        '포트폴리오': 'Portfolio',
        '쇼핑몰': 'E-commerce',
        '스타트업': 'Startup'
      };
      return titles[found] || 'Component';
    }
    return 'Landing Page';
  };

  const extractFeatures = (content: string): string[] => {
    const features = [];
    if (content.includes('네비게이션') || content.includes('헤더')) features.push('반응형 네비게이션: 블러 효과가 적용된 고정 헤더');
    if (content.includes('히어로') || content.includes('메인')) features.push('히어로 섹션: 애니메이션이 적용된 강렬한 타이포그래피');
    if (content.includes('카드') || content.includes('컴포넌트')) features.push('피처 카드: 아이콘과 호버 효과가 적용된 인터랙티브 요소');
    if (content.includes('푸터') || content.includes('하단')) features.push('푸터: 소셜 링크가 포함된 멀티 컬럼 레이아웃');
    
    if (features.length === 0) {
      features.push('반응형 네비게이션: 블러 효과가 적용된 고정 헤더');
      features.push('히어로 섹션: 애니메이션이 적용된 강렬한 타이포그래피');
      features.push('피처 카드: 아이콘과 호버 효과가 적용된 인터랙티브 요소');
      features.push('모던 UI: 부드러운 전환 효과와 깔끔한 디자인');
    }
    return features;
  };

  // HTML을 썸네일 이미지로 변환 - Canvas에서 렌더링된 iframe을 캡처
  const captureNodeThumbnail = useCallback(async (nodeId: string): Promise<string | null> => {
    try {
      console.log('[Thumbnail] Capturing thumbnail for node:', nodeId);
      
      // Canvas에서 렌더링된 iframe 찾기
      const iframe = document.querySelector(`iframe[data-node-id="${nodeId}"]`) as HTMLIFrameElement;
      
      if (!iframe) {
        console.warn('[Thumbnail] Iframe not found for node:', nodeId);
        return null;
      }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc || !iframeDoc.body) {
        console.warn('[Thumbnail] Cannot access iframe document');
        return null;
      }

      // 렌더링이 완료될 때까지 대기
      await new Promise(resolve => setTimeout(resolve, 1500));

      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(iframeDoc.body, {
        width: 1440,
        height: 900,
        scale: 0.25, // 360x225 thumbnail
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // 클론된 문서에서 스크롤 위치를 최상단으로
          clonedDoc.body.style.overflow = 'hidden';
        }
      });
      
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
      console.log('[Thumbnail] Capture successful, size:', thumbnailUrl.length);
      return thumbnailUrl;
    } catch (error) {
      console.error('[Thumbnail] Error capturing:', error);
      return null;
    }
  }, []);

  const handleSendMessage = async (content: string, images: string[], model: ModelType) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content,
      imageUrl: images.length > 0 ? images[0] : undefined,
      imageUrls: images.length > 0 ? images : undefined,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);
    
    // 유저 메시지 저장
    const currentProjectId = projectIdRef.current || project?.id;
    if (currentProjectId) {
      saveMessage(userMsg, currentProjectId);
    }

    const botMsgId = (Date.now() + 1).toString();
    const componentTitle = extractComponentTitle(content);

    const initialSections: GenerationSection[] = [
      { id: 'think1', type: 'thinking', label: '분석 중', status: 'active', isExpanded: false },
      { id: 'create', type: 'action', label: '페이지 노드 생성', status: 'pending' },
      { id: 'think2', type: 'thinking', label: '설계 중', status: 'pending', isExpanded: true },
      { 
        id: 'files', 
        type: 'files', 
        label: '파일 생성', 
        status: 'pending',
        files: [
          { id: 'pkg', path: '/package.json', type: 'new', language: 'json', status: 'pending' },
          { id: 'app', path: '/src/App.tsx', type: 'new', language: 'tsx', status: 'pending' },
          { id: 'component', path: '/src/Component.tsx', type: 'new', language: 'tsx', status: 'pending' },
          { id: 'readme', path: '/README.md', type: 'new', language: 'md', status: 'pending' }
        ]
      },
      { id: 'build', type: 'action', label: '페이지 빌드', status: 'pending' },
      { id: 'result', type: 'result', label: '완료', status: 'pending', features: [] }
    ];

    setMessages(prev => [...prev, {
      id: botMsgId,
      role: Role.MODEL,
      content: '',
      timestamp: Date.now(),
      isThinking: true,
      generationSections: initialSections,
      componentTitle
    }]);

    let targetNodeId: string;
    let previousCode: string | undefined = undefined;

    if (selectedNodeId) {
       targetNodeId = selectedNodeId;
       const targetNode = nodes.find(n => n.id === targetNodeId);
       if (targetNode && targetNode.html) {
          previousCode = targetNode.html;
       }
    } else {
       const GAP = 100;
       const DEFAULT_WIDTH = 1440;
       const DEFAULT_HEIGHT = 900;
       
       let startX = 0;
       if (nodes.length > 0) {
         const lastNode = nodes[nodes.length - 1];
         startX = lastNode.x + lastNode.width + GAP;
       }

       targetNodeId = `node-${Date.now()}`;
       const newNode: DesignNode = {
         id: targetNodeId,
         type: 'component',
         title: componentTitle,
         html: '', 
         x: startX,
         y: 0,
         width: DEFAULT_WIDTH,
         height: DEFAULT_HEIGHT
       };
       setNodes(prev => [...prev, newNode]);
       setFocusTrigger({ id: targetNodeId, timestamp: Date.now() });
    }

    try {
      const speedFactor = model === 'fast' ? 0.5 : 1;
      
      await new Promise(r => setTimeout(r, 1500 * speedFactor));
      updateSection(botMsgId, 'think1', { status: 'completed', duration: 1500 * speedFactor });
      
      updateSection(botMsgId, 'create', { status: 'active' });
      await new Promise(r => setTimeout(r, 500 * speedFactor));
      updateSection(botMsgId, 'create', { status: 'completed', duration: 500 * speedFactor });
      
      updateSection(botMsgId, 'think2', { status: 'active' });
      await new Promise(r => setTimeout(r, 2000 * speedFactor));
      updateSection(botMsgId, 'think2', { status: 'completed', duration: 2000 * speedFactor });
      
      updateSection(botMsgId, 'files', { status: 'active' });
      
      const fileConfigs = [
        { id: 'pkg', lines: 10, delay: 300 },
        { id: 'app', lines: 9, delay: 400 },
        { id: 'component', lines: 0, delay: 0 },
        { id: 'readme', lines: 28, delay: 200 }
      ];
      
      for (const config of fileConfigs.slice(0, 2)) {
        updateFileInSection(botMsgId, 'files', config.id, { status: 'generating' });
        await new Promise(r => setTimeout(r, config.delay * speedFactor));
        updateFileInSection(botMsgId, 'files', config.id, { status: 'completed', linesAdded: config.lines });
      }

      updateFileInSection(botMsgId, 'files', 'component', { status: 'generating' });
      
      let fullResponse = '';
      let lineCount = 0;
      let lastUpdateTime = 0;
      const UPDATE_INTERVAL = 500;
      
      let finalPrompt = content;
      if (selectedElement && selectedNodeId && selectedElement.nodeId === selectedNodeId) {
        finalPrompt = `
[ELEMENT-SPECIFIC MODIFICATION REQUEST]
Target Element:
- Tag: <${selectedElement.tagName.toLowerCase()}>
- ID: ${selectedElement.id || 'none'}
- Class: ${selectedElement.className || 'none'}
- Current Text: "${selectedElement.text?.substring(0, 100) || ''}"
${selectedElement.outerHtml ? `- Current HTML: ${selectedElement.outerHtml.substring(0, 300)}` : ''}

User Request: ${content}

IMPORTANT: Only modify THIS SPECIFIC ELEMENT and its children. Keep ALL other parts of the page EXACTLY as they are.
Find this element in the existing code and apply the requested changes ONLY to it.
Return the COMPLETE HTML with this single element modified.
`;
        setSelectedElement(null);
      }
      
      const streamResult: StreamResult = await generateDesignStream(finalPrompt, images, previousCode, model, (chunk) => {
         fullResponse += chunk;
         lineCount = (fullResponse.match(/\n/g) || []).length;
         
         setNodes(currentNodes => currentNodes.map(n => 
           n.id === targetNodeId 
             ? { ...n, html: extractHtml(fullResponse) } 
             : n
         ));
         
         const now = Date.now();
         if (now - lastUpdateTime > UPDATE_INTERVAL) {
           updateFileInSection(botMsgId, 'files', 'component', { linesAdded: lineCount });
           lastUpdateTime = now;
         }
      });

      // Supabase에서 크레딧 차감 (전역 연동)
      console.log('[Credits] Deducting credits from Supabase...');
      await deductSupabaseCredits('generation', project?.id);
      console.log('[Credits] Credits deducted successfully');

      updateFileInSection(botMsgId, 'files', 'component', { status: 'completed', linesAdded: lineCount || 445 });
      
      updateFileInSection(botMsgId, 'files', 'readme', { status: 'generating' });
      await new Promise(r => setTimeout(r, 200 * speedFactor));
      updateFileInSection(botMsgId, 'files', 'readme', { status: 'completed', linesAdded: 28 });
      
      updateSection(botMsgId, 'files', { status: 'completed' });

      updateSection(botMsgId, 'build', { status: 'active' });
      await new Promise(r => setTimeout(r, 800 * speedFactor));
      updateSection(botMsgId, 'build', { status: 'completed', duration: 800 * speedFactor });

      const cleanHtml = extractHtml(fullResponse);
      const features = extractFeatures(content);
      
      updateSection(botMsgId, 'result', { 
        status: 'completed',
        resultSummary: `${componentTitle} 페이지를 성공적으로 생성했습니다.`,
        features
      });

      const finalNode: DesignNode = {
        id: targetNodeId,
        type: 'component',
        title: componentTitle,
        html: cleanHtml,
        x: nodes.find(n => n.id === targetNodeId)?.x || 0,
        y: nodes.find(n => n.id === targetNodeId)?.y || 0,
        width: nodes.find(n => n.id === targetNodeId)?.width || 1440,
        height: nodes.find(n => n.id === targetNodeId)?.height || 900,
      };

      setNodes(currentNodes => currentNodes.map(n => 
        n.id === targetNodeId ? finalNode : n
      ));

      // Auto-save the generated node
      const currentProjectId = projectIdRef.current || project?.id;
      if (currentProjectId) {
        console.log('[EditorPage] Saving node to project:', currentProjectId);
        await saveNodeImmediate(finalNode, currentProjectId);
        
        // Capture and save thumbnail for the first node
        const currentNodes = nodes.filter(n => n.id !== targetNodeId);
        if (currentNodes.length === 0) {
          // 노드가 렌더링된 후 썸네일 캡처 (더 긴 대기 시간)
          setTimeout(async () => {
            const thumbnail = await captureNodeThumbnail(targetNodeId);
            if (thumbnail) {
              console.log('[EditorPage] Updating project thumbnail');
              updateProjectThumbnail(thumbnail);
            }
          }, 2500); // iframe 렌더링 완료 후 캡처
        }
      } else {
        console.warn('[EditorPage] Cannot save: no project ID available');
      }

      setMessages(prev => {
        const updatedMessages = prev.map(msg => 
          msg.id === botMsgId 
            ? { 
                ...msg, 
                isThinking: false,
                creditsUsed: Math.round(creditsUsed * 100) / 100,
                tokenUsage: streamResult.tokenUsage
              }
            : msg
        );
        
        // 완료된 봇 메시지 저장
        const completedBotMsg = updatedMessages.find(m => m.id === botMsgId);
        if (completedBotMsg && currentProjectId) {
          saveMessage(completedBotMsg, currentProjectId);
        }
        
        return updatedMessages;
      });

    } catch (error: any) {
      console.error('Generation Error:', error);
      const errorMessage = error?.message || error?.toString() || '알 수 없는 오류';
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: Role.MODEL,
        content: `오류가 발생했습니다: ${errorMessage}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // handleSendMessage를 ref로 저장 (의존성 문제 해결)
  const handleSendMessageRef = useRef(handleSendMessage);
  handleSendMessageRef.current = handleSendMessage;

  // 초기 프롬프트가 있으면 자동으로 생성 시작
  useEffect(() => {
    if (initialPrompt && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      
      // 약간의 딜레이 후 생성 시작 (cleanup에서 취소하지 않음)
      setTimeout(() => {
        if (handleSendMessageRef.current) {
          handleSendMessageRef.current(initialPrompt, initialImages, 'pro');
        }
      }, 300);
    }
  }, [initialPrompt, initialImages]);

  const handleUpdateNode = (updatedNode: DesignNode) => {
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
    // Auto-save to database
    const pid = projectIdRef.current || project?.id;
    if (pid) {
      saveNode(updatedNode, pid);
    }
  };

  const handleAddNode = (newNode: DesignNode) => {
    setNodes(prev => [...prev, newNode]);
    // Auto-save to database
    const pid = projectIdRef.current || project?.id;
    if (pid) {
      saveNode(newNode, pid);
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    // Delete from database
    deleteNodeFromDb(nodeId);
  };

  const handleOpenPreviewTab = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.html) return;
    
    const existingTab = previewTabs.find(t => t.nodeId === nodeId);
    if (existingTab) {
      setActiveTab(nodeId);
    } else {
      const newTab: PreviewTab = {
        id: `tab-${Date.now()}`,
        nodeId: nodeId,
        title: node.title
      };
      setPreviewTabs(prev => [...prev, newTab]);
      setActiveTab(nodeId);
    }
  };

  const handleClosePreviewTab = (nodeId: string) => {
    setPreviewTabs(prev => prev.filter(t => t.nodeId !== nodeId));
    if (activeTab === nodeId) {
      setActiveTab('canvas');
    }
  };

  const handleNewChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: Role.MODEL,
      content: "디자인할 준비가 되었습니다. 만들고 싶은 페이지를 설명해주세요.",
      timestamp: Date.now()
    }]);
    setNodes([]);
    setFocusTrigger(null);
    setSelectedNodeId(null);
    setIsGenerating(false);
    setVariantState({ isActive: false, sourceNodeId: null, sourceNodeTitle: '', sourceNodeHtml: '' });
  };

  const handleStartVariant = (nodeId: string) => {
    const sourceNode = nodes.find(n => n.id === nodeId);
    if (!sourceNode || !sourceNode.html) return;
    
    setVariantState({
      isActive: true,
      sourceNodeId: nodeId,
      sourceNodeTitle: sourceNode.title,
      sourceNodeHtml: sourceNode.html
    });
  };

  const handleCancelVariant = () => {
    setVariantState({
      isActive: false,
      sourceNodeId: null,
      sourceNodeTitle: '',
      sourceNodeHtml: ''
    });
  };

  const handleCreateVariantFromCanvas = async (nodeId: string, prompt: string) => {
    const sourceNode = nodes.find(n => n.id === nodeId);
    if (!sourceNode || !sourceNode.html) return;

    const model: ModelType = 'fast';
    const currentProjectId = projectIdRef.current || project?.id;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: `[${sourceNode.title} 변종] ${prompt}`,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);
    
    // 유저 메시지 저장
    if (currentProjectId) {
      saveMessage(userMsg, currentProjectId);
    }

    const botMsgId = (Date.now() + 1).toString();
    const variantTitle = `${sourceNode.title} - ${prompt.slice(0, 15)}${prompt.length > 15 ? '...' : ''}`;

    const initialSections: GenerationSection[] = [
      { id: 'think1', type: 'thinking', label: '원본 분석 중', status: 'active', isExpanded: false },
      { id: 'files', type: 'files', label: '변종 생성', status: 'pending', files: [
        { id: 'component', path: '/variant.html', type: 'new', language: 'html', status: 'pending' }
      ]},
      { id: 'result', type: 'result', label: '완료', status: 'pending', features: [] }
    ];

    setMessages(prev => [...prev, {
      id: botMsgId,
      role: Role.MODEL,
      content: '',
      timestamp: Date.now(),
      isThinking: true,
      generationSections: initialSections,
      componentTitle: variantTitle
    }]);

    const GAP = 100;
    const newNodeId = `node-${Date.now()}`;
    const newNode: DesignNode = {
      id: newNodeId,
      type: 'component',
      title: variantTitle,
      html: '',
      x: sourceNode.x + sourceNode.width + GAP,
      y: sourceNode.y,
      width: sourceNode.width,
      height: sourceNode.height
    };
    setNodes(prev => [...prev, newNode]);
    setFocusTrigger({ id: newNodeId, timestamp: Date.now() });
    setSelectedNodeId(null);

    try {
      await new Promise(r => setTimeout(r, 800));
      updateSection(botMsgId, 'think1', { status: 'completed', duration: 800 });
      
      updateSection(botMsgId, 'files', { status: 'active' });
      updateFileInSection(botMsgId, 'files', 'component', { status: 'generating' });
      
      let fullResponse = '';
      let lineCount = 0;
      
      const variantResult: StreamResult = await generateDesignStream(prompt, [], sourceNode.html, model, (chunk) => {
        fullResponse += chunk;
        lineCount = (fullResponse.match(/\n/g) || []).length;
        
        setNodes(currentNodes => currentNodes.map(n => 
          n.id === newNodeId 
            ? { ...n, html: extractHtml(fullResponse) } 
            : n
        ));
        
        updateFileInSection(botMsgId, 'files', 'component', { linesAdded: lineCount });
      });

      // Supabase에서 크레딧 차감 (변종 생성)
      await deductSupabaseCredits('variant', project?.id);

      updateFileInSection(botMsgId, 'files', 'component', { status: 'completed', linesAdded: lineCount || 400 });
      updateSection(botMsgId, 'files', { status: 'completed' });

      const cleanHtml = extractHtml(fullResponse);
      
      updateSection(botMsgId, 'result', { 
        status: 'completed',
        resultSummary: `${sourceNode.title}의 변종을 생성했습니다.`,
        features: ['원본 디자인 기반', prompt]
      });

      const finalVariantNode: DesignNode = {
        id: newNodeId,
        type: 'component',
        title: variantTitle,
        html: cleanHtml,
        x: sourceNode.x + sourceNode.width + GAP,
        y: sourceNode.y,
        width: sourceNode.width,
        height: sourceNode.height,
      };

      setNodes(currentNodes => currentNodes.map(n => 
        n.id === newNodeId ? finalVariantNode : n
      ));

      // 변종 노드 저장
      if (currentProjectId) {
        console.log('[EditorPage] Saving variant node:', newNodeId);
        await saveNodeImmediate(finalVariantNode, currentProjectId);
      }

      setMessages(prev => {
        const updatedMessages = prev.map(msg => 
          msg.id === botMsgId 
            ? { 
                ...msg, 
                isThinking: false,
                creditsUsed: Math.round(variantCreditsUsed * 100) / 100,
                tokenUsage: variantResult.tokenUsage
              }
            : msg
        );
        
        // 완료된 봇 메시지 저장
        const completedBotMsg = updatedMessages.find(m => m.id === botMsgId);
        if (completedBotMsg && currentProjectId) {
          saveMessage(completedBotMsg, currentProjectId);
        }
        
        return updatedMessages;
      });

    } catch (error) {
      console.error(error);
      setNodes(prev => prev.filter(n => n.id !== newNodeId));
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: Role.MODEL,
        content: "변종 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateVariant = async (prompt: string, model: ModelType) => {
    if (!variantState.sourceNodeId || !variantState.sourceNodeHtml) return;
    
    const sourceNode = nodes.find(n => n.id === variantState.sourceNodeId);
    if (!sourceNode) return;
    
    const currentProjectId = projectIdRef.current || project?.id;

    setVariantState({
      isActive: false,
      sourceNodeId: null,
      sourceNodeTitle: '',
      sourceNodeHtml: ''
    });

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: `[${sourceNode.title} 변종 생성] ${prompt}`,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);
    
    // 유저 메시지 저장
    if (currentProjectId) {
      saveMessage(userMsg, currentProjectId);
    }

    const botMsgId = (Date.now() + 1).toString();
    const variantTitle = `${sourceNode.title} (Variant)`;

    const initialSections: GenerationSection[] = [
      { id: 'think1', type: 'thinking', label: 'Analyzing original design', status: 'active', isExpanded: false },
      { id: 'create', type: 'action', label: 'Create Variant Node', status: 'pending' },
      { id: 'think2', type: 'thinking', label: 'Applying modifications', status: 'pending', isExpanded: true },
      { 
        id: 'files', 
        type: 'files', 
        label: 'Generated Files', 
        status: 'pending',
        files: [
          { id: 'component', path: '/src/Component.tsx', type: 'new', language: 'tsx', status: 'pending' },
        ]
      },
      { id: 'build', type: 'action', label: 'Building variant', status: 'pending' },
      { id: 'result', type: 'result', label: 'Result', status: 'pending', features: [] }
    ];

    setMessages(prev => [...prev, {
      id: botMsgId,
      role: Role.MODEL,
      content: '',
      timestamp: Date.now(),
      isThinking: true,
      generationSections: initialSections,
      componentTitle: variantTitle
    }]);

    const GAP = 100;
    const newNodeId = `node-${Date.now()}`;
    const newNode: DesignNode = {
      id: newNodeId,
      type: 'component',
      title: variantTitle,
      html: '',
      x: sourceNode.x + sourceNode.width + GAP,
      y: sourceNode.y,
      width: sourceNode.width,
      height: sourceNode.height
    };
    setNodes(prev => [...prev, newNode]);
    setFocusTrigger({ id: newNodeId, timestamp: Date.now() });
    setSelectedNodeId(null);

    try {
      const speedFactor = model === 'fast' ? 0.5 : 1;
      
      await new Promise(r => setTimeout(r, 1500 * speedFactor));
      updateSection(botMsgId, 'think1', { status: 'completed', duration: 1500 * speedFactor });
      
      updateSection(botMsgId, 'create', { status: 'active' });
      await new Promise(r => setTimeout(r, 500 * speedFactor));
      updateSection(botMsgId, 'create', { status: 'completed', duration: 500 * speedFactor });
      
      updateSection(botMsgId, 'think2', { status: 'active' });
      await new Promise(r => setTimeout(r, 2000 * speedFactor));
      updateSection(botMsgId, 'think2', { status: 'completed', duration: 2000 * speedFactor });
      
      updateSection(botMsgId, 'files', { status: 'active' });
      updateFileInSection(botMsgId, 'files', 'component', { status: 'generating' });
      
      let fullResponse = '';
      let lineCount = 0;
      
      const variantStreamResult: StreamResult = await generateDesignStream(prompt, [], variantState.sourceNodeHtml, model, (chunk) => {
        fullResponse += chunk;
        lineCount = (fullResponse.match(/\n/g) || []).length;
        
        setNodes(currentNodes => currentNodes.map(n => 
          n.id === newNodeId 
            ? { ...n, html: extractHtml(fullResponse) } 
            : n
        ));
        
        updateFileInSection(botMsgId, 'files', 'component', { linesAdded: lineCount });
      });

      // Supabase에서 크레딧 차감 (변종 생성)
      await deductSupabaseCredits('variant', project?.id);

      updateFileInSection(botMsgId, 'files', 'component', { status: 'completed', linesAdded: lineCount || 400 });
      updateSection(botMsgId, 'files', { status: 'completed' });

      updateSection(botMsgId, 'build', { status: 'active' });
      await new Promise(r => setTimeout(r, 800 * speedFactor));
      updateSection(botMsgId, 'build', { status: 'completed', duration: 800 * speedFactor });

      const cleanHtml = extractHtml(fullResponse);
      
      updateSection(botMsgId, 'result', { 
        status: 'completed',
        resultSummary: `Created a variant of ${sourceNode.title} with the requested modifications.`,
        features: ['Based on original design', 'Applied style changes', 'Maintained structure']
      });

      const finalVariantNode: DesignNode = {
        id: newNodeId,
        type: 'component',
        title: variantTitle,
        html: cleanHtml,
        x: sourceNode.x + sourceNode.width + GAP,
        y: sourceNode.y,
        width: sourceNode.width,
        height: sourceNode.height,
      };

      setNodes(currentNodes => currentNodes.map(n => 
        n.id === newNodeId ? finalVariantNode : n
      ));

      // 변종 노드 저장
      if (currentProjectId) {
        console.log('[EditorPage] Saving variant node:', newNodeId);
        await saveNodeImmediate(finalVariantNode, currentProjectId);
      }

      setMessages(prev => {
        const updatedMessages = prev.map(msg => 
          msg.id === botMsgId 
            ? { 
                ...msg, 
                isThinking: false,
                creditsUsed: Math.round(variantCredits * 100) / 100,
                tokenUsage: variantStreamResult.tokenUsage
              }
            : msg
        );
        
        // 완료된 봇 메시지 저장
        const completedBotMsg = updatedMessages.find(m => m.id === botMsgId);
        if (completedBotMsg && currentProjectId) {
          saveMessage(completedBotMsg, currentProjectId);
        }
        
        return updatedMessages;
      });

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: Role.MODEL,
        content: "변종 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-50 overflow-hidden">
      {isSidebarOpen && (
        <Sidebar 
          width={sidebarWidth}
          onResizeStart={startResizing}
          projectName={projectName}
          onRenameProject={(name) => {
            setProjectName(name);
            // 서버에도 저장
            if (project || projectIdRef.current) {
              updateProjectName(name);
            }
          }}
          onToggleSidebar={() => setIsSidebarOpen(false)}
          messages={messages} 
          nodes={nodes}
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          onFocusNode={(id) => {
              setFocusTrigger({ id, timestamp: Date.now() });
              setSelectedNodeId(id);
          }}
          onNewChat={handleNewChat}
          selectedNodeId={selectedNodeId}
          onClearSelection={() => setSelectedNodeId(null)}
          variantState={variantState}
          onCancelVariant={handleCancelVariant}
          onCreateVariant={handleCreateVariant}
          selectedElement={selectedElement}
          onClearSelectedElement={() => setSelectedElement(null)}
          onNavigateBack={onNavigateBack}
        />
      )}
      {!isSidebarOpen && (
        <div className="absolute top-3 left-3 z-50 flex gap-2">
          <button
            onClick={onNavigateBack}
            className="p-2.5 bg-white border border-gray-200 shadow-lg rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
            title="홈으로"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2.5 bg-white border border-gray-200 shadow-lg rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all animate-in fade-in slide-in-from-left-2"
            title="사이드바 열기"
          >
            <PanelLeftOpen size={20} />
          </button>
        </div>
      )}
      <Canvas 
        nodes={nodes}
        isLoading={isGenerating}
        focusTrigger={focusTrigger}
        onUpdateNode={handleUpdateNode}
        onAddNode={handleAddNode}
        onDeleteNode={handleDeleteNode}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        onStartVariant={handleStartVariant}
        onCreateVariant={handleCreateVariantFromCanvas}
        onOpenPreviewTab={handleOpenPreviewTab}
        previewTabs={previewTabs}
        activeTab={activeTab}
        onSetActiveTab={setActiveTab}
        onClosePreviewTab={handleClosePreviewTab}
        onSelectElement={setSelectedElement}
        projectId={projectIdRef.current || project?.id}
        userId={user?.id}
      />
    </div>
  );
};

