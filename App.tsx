import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { PanelLeftOpen } from 'lucide-react';
import { Message, Role, DesignNode, FileArtifact, GenerationSection, VariantCreationState, PreviewTab, SelectedElement } from './types';
import { generateDesignStream, extractHtml, ModelType } from './services/geminiService';

const App: React.FC = () => {
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const isResizing = useRef(false);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
  
  // 변종 만들기 상태
  const [variantState, setVariantState] = useState<VariantCreationState>({
    isActive: false,
    sourceNodeId: null,
    sourceNodeTitle: '',
    sourceNodeHtml: ''
  });

  // 미리보기 탭 상태
  const [previewTabs, setPreviewTabs] = useState<PreviewTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('canvas'); // 'canvas' 또는 nodeId

  // 선택된 요소 상태 (세부 요소 수정용)
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

  // Helper function to extract component title from user content
  const extractComponentTitle = (content: string): string => {
    const keywords = ['랜딩', '대시보드', '로그인', '프로필', '설정', '결제', '상품', '카드'];
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
        '카드': 'Card Component'
      };
      return titles[found] || 'Component';
    }
    return 'Landing Page';
  };

  // Helper function to extract features from content
  const extractFeatures = (content: string): string[] => {
    const features = [];
    if (content.includes('네비게이션') || content.includes('헤더')) features.push('반응형 네비게이션: 블러 효과가 적용된 고정 헤더');
    if (content.includes('히어로') || content.includes('메인')) features.push('히어로 섹션: 애니메이션이 적용된 강렬한 타이포그래피');
    if (content.includes('카드') || content.includes('컴포넌트')) features.push('피처 카드: 아이콘과 호버 효과가 적용된 인터랙티브 요소');
    if (content.includes('푸터') || content.includes('하단')) features.push('푸터: 소셜 링크가 포함된 멀티 컬럼 레이아웃');
    
    // Default features if none matched
    if (features.length === 0) {
      features.push('반응형 네비게이션: 블러 효과가 적용된 고정 헤더');
      features.push('히어로 섹션: 애니메이션이 적용된 강렬한 타이포그래피');
      features.push('피처 카드: 아이콘과 호버 효과가 적용된 인터랙티브 요소');
      features.push('모던 UI: 부드러운 전환 효과와 깔끔한 디자인');
    }
    return features;
  };

  const handleSendMessage = async (content: string, images: string[], model: ModelType) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content,
      imageUrl: images.length > 0 ? images[0] : undefined, // 첫 번째 이미지만 UI에 표시
      imageUrls: images.length > 0 ? images : undefined, // 모든 이미지 저장
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    const botMsgId = (Date.now() + 1).toString();
    
    // Determine component title from content
    const componentTitle = extractComponentTitle(content);

    // 새로운 생성 섹션 구조
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

    // Determine target: New Node or Existing Node (Update)
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
      
      // Phase 1: Initial thinking
      await new Promise(r => setTimeout(r, 1500 * speedFactor));
      updateSection(botMsgId, 'think1', { status: 'completed', duration: 1500 * speedFactor });
      
      // Phase 2: Create Component Node
      updateSection(botMsgId, 'create', { status: 'active' });
      await new Promise(r => setTimeout(r, 500 * speedFactor));
      updateSection(botMsgId, 'create', { status: 'completed', duration: 500 * speedFactor });
      
      // Phase 3: Second thinking phase
      updateSection(botMsgId, 'think2', { status: 'active' });
      await new Promise(r => setTimeout(r, 2000 * speedFactor));
      updateSection(botMsgId, 'think2', { status: 'completed', duration: 2000 * speedFactor });
      
      // Phase 4: File generation with progressive updates
      updateSection(botMsgId, 'files', { status: 'active' });
      
      // Generate files one by one
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

      // Start streaming the main component
      updateFileInSection(botMsgId, 'files', 'component', { status: 'generating' });
      
      let fullResponse = '';
      let lineCount = 0;
      let lastUpdateTime = 0;
      const UPDATE_INTERVAL = 500; // 500ms마다 라인 수 업데이트 (throttle)
      
      // 선택된 요소가 있으면 해당 요소만 수정하도록 프롬프트 조정
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
        // 요소 수정 후 선택 해제
        setSelectedElement(null);
      }
      
      await generateDesignStream(finalPrompt, images, previousCode, model, (chunk) => {
         fullResponse += chunk;
         lineCount = (fullResponse.match(/\n/g) || []).length;
         
         // Real-time update for canvas
         setNodes(currentNodes => currentNodes.map(n => 
           n.id === targetNodeId 
             ? { ...n, html: extractHtml(fullResponse) } 
             : n
         ));
         
         // Throttled update for line count (prevent flickering)
         const now = Date.now();
         if (now - lastUpdateTime > UPDATE_INTERVAL) {
           updateFileInSection(botMsgId, 'files', 'component', { linesAdded: lineCount });
           lastUpdateTime = now;
         }
      });

      updateFileInSection(botMsgId, 'files', 'component', { status: 'completed', linesAdded: lineCount || 445 });
      
      // Generate README
      updateFileInSection(botMsgId, 'files', 'readme', { status: 'generating' });
      await new Promise(r => setTimeout(r, 200 * speedFactor));
      updateFileInSection(botMsgId, 'files', 'readme', { status: 'completed', linesAdded: 28 });
      
      updateSection(botMsgId, 'files', { status: 'completed' });

      // Phase 5: Building
      updateSection(botMsgId, 'build', { status: 'active' });
      await new Promise(r => setTimeout(r, 800 * speedFactor));
      updateSection(botMsgId, 'build', { status: 'completed', duration: 800 * speedFactor });

      const cleanHtml = extractHtml(fullResponse);
      
      // Extract features from content
      const features = extractFeatures(content);
      
      // Phase 6: Result
      updateSection(botMsgId, 'result', { 
        status: 'completed',
        resultSummary: `${componentTitle} 페이지를 성공적으로 생성했습니다.`,
        features
      });

      // Finalize
      setNodes(currentNodes => currentNodes.map(n => 
        n.id === targetNodeId 
          ? { ...n, html: cleanHtml, title: componentTitle } 
          : n
      ));

      setMessages(prev => prev.map(msg => 
        msg.id === botMsgId 
          ? { ...msg, isThinking: false }
          : msg
      ));

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

  const handleUpdateNode = (updatedNode: DesignNode) => {
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
  };

  // 노드 추가
  const handleAddNode = (newNode: DesignNode) => {
    setNodes(prev => [...prev, newNode]);
  };

  // 노드 삭제
  const handleDeleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  // 미리보기 탭 열기
  const handleOpenPreviewTab = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.html) return;
    
    // 이미 열린 탭인지 확인
    const existingTab = previewTabs.find(t => t.nodeId === nodeId);
    if (existingTab) {
      // 이미 열려있으면 해당 탭으로 전환
      setActiveTab(nodeId);
    } else {
      // 새 탭 추가
      const newTab: PreviewTab = {
        id: `tab-${Date.now()}`,
        nodeId: nodeId,
        title: node.title
      };
      setPreviewTabs(prev => [...prev, newTab]);
      setActiveTab(nodeId);
    }
  };

  // 미리보기 탭 닫기
  const handleClosePreviewTab = (nodeId: string) => {
    setPreviewTabs(prev => prev.filter(t => t.nodeId !== nodeId));
    // 현재 활성 탭이 닫히면 Canvas로 이동
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

  // 변종 만들기 시작 - 캔버스에서 버튼 클릭 시 호출
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

  // 변종 만들기 취소
  const handleCancelVariant = () => {
    setVariantState({
      isActive: false,
      sourceNodeId: null,
      sourceNodeTitle: '',
      sourceNodeHtml: ''
    });
  };

  // Canvas에서 호출되는 변종 생성 핸들러
  const handleCreateVariantFromCanvas = async (nodeId: string, prompt: string) => {
    const sourceNode = nodes.find(n => n.id === nodeId);
    if (!sourceNode || !sourceNode.html) return;

    // 기본 모델: fast
    const model: ModelType = 'fast';
    
    // 유저 메시지 추가
    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: `[${sourceNode.title} 변종] ${prompt}`,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

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

    // 새 노드를 원본 우측에 생성
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
      
      // 원본 HTML을 previousCode로 전달하여 변종 생성
      await generateDesignStream(prompt, [], sourceNode.html, model, (chunk) => {
        fullResponse += chunk;
        lineCount = (fullResponse.match(/\n/g) || []).length;
        
        setNodes(currentNodes => currentNodes.map(n => 
          n.id === newNodeId 
            ? { ...n, html: extractHtml(fullResponse) } 
            : n
        ));
        
        updateFileInSection(botMsgId, 'files', 'component', { linesAdded: lineCount });
      });

      updateFileInSection(botMsgId, 'files', 'component', { status: 'completed', linesAdded: lineCount || 400 });
      updateSection(botMsgId, 'files', { status: 'completed' });

      const cleanHtml = extractHtml(fullResponse);
      
      updateSection(botMsgId, 'result', { 
        status: 'completed',
        resultSummary: `${sourceNode.title}의 변종을 생성했습니다.`,
        features: ['원본 디자인 기반', prompt]
      });

      setNodes(currentNodes => currentNodes.map(n => 
        n.id === newNodeId 
          ? { ...n, html: cleanHtml, title: variantTitle } 
          : n
      ));

      setMessages(prev => prev.map(msg => 
        msg.id === botMsgId 
          ? { ...msg, isThinking: false }
          : msg
      ));

    } catch (error) {
      console.error(error);
      // 에러 시 생성된 빈 노드 제거
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

  // 변종 생성 실행 - 원본을 기반으로 새 노드를 우측에 생성 (Sidebar용)
  const handleCreateVariant = async (prompt: string, model: ModelType) => {
    if (!variantState.sourceNodeId || !variantState.sourceNodeHtml) return;
    
    const sourceNode = nodes.find(n => n.id === variantState.sourceNodeId);
    if (!sourceNode) return;

    // 변종 상태 초기화
    setVariantState({
      isActive: false,
      sourceNodeId: null,
      sourceNodeTitle: '',
      sourceNodeHtml: ''
    });

    // 유저 메시지 추가
    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: `[${sourceNode.title} 변종 생성] ${prompt}`,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

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

    // 새 노드를 원본 우측에 생성
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
    setSelectedNodeId(null); // 선택 해제

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
      
      // 원본 HTML을 previousCode로 전달하여 변종 생성
      await generateDesignStream(prompt, [], variantState.sourceNodeHtml, model, (chunk) => {
        fullResponse += chunk;
        lineCount = (fullResponse.match(/\n/g) || []).length;
        
        setNodes(currentNodes => currentNodes.map(n => 
          n.id === newNodeId 
            ? { ...n, html: extractHtml(fullResponse) } 
            : n
        ));
        
        updateFileInSection(botMsgId, 'files', 'component', { linesAdded: lineCount });
      });

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

      setNodes(currentNodes => currentNodes.map(n => 
        n.id === newNodeId 
          ? { ...n, html: cleanHtml, title: variantTitle } 
          : n
      ));

      setMessages(prev => prev.map(msg => 
        msg.id === botMsgId 
          ? { ...msg, isThinking: false }
          : msg
      ));

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
          onRenameProject={setProjectName}
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
        />
      )}
      {!isSidebarOpen && (
        <div className="absolute top-3 left-3 z-50">
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
      />
    </div>
  );
};

export default App;
