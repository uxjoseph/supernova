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
  initialModelType?: ModelType;
  onNavigateBack: () => void;
}

export const EditorPage: React.FC<EditorPageProps> = ({ 
  initialPrompt, 
  initialImages = [],
  initialProjectId,
  initialModelType,
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

  // HTML을 썸네일 이미지로 변환 - 안전하게 격리된 환경에서 캡처
  // 스크립트를 완전히 제거한 HTML만 로드하여 부모 창에 영향 없음
  const captureNodeThumbnail = useCallback(async (nodeId: string, htmlContent?: string): Promise<string | null> => {
    return new Promise(async (resolve) => {
      let tempContainer: HTMLDivElement | null = null;
      
      try {
        console.log('[Thumbnail] Capturing thumbnail for node:', nodeId);
        
        // HTML 콘텐츠 가져오기
        const node = nodes.find(n => n.id === nodeId);
        const html = htmlContent || node?.html;
        
        if (!html || html.length < 100) {
          console.warn('[Thumbnail] No HTML content available for node:', nodeId);
          resolve(null);
          return;
        }

        // html2canvas 동적 임포트
        let html2canvas: any;
        try {
          html2canvas = (await import('html2canvas')).default;
        } catch (importError) {
          console.error('[Thumbnail] Failed to load html2canvas:', importError);
          resolve(null);
          return;
        }
        
        // HTML을 썸네일 캡처용으로 정리
        // Tailwind CDN은 유지하고, 위험한 사용자 스크립트만 제거
        const sanitizeHtmlForThumbnail = (rawHtml: string): string => {
          // 보호 스크립트: iframe 내에서 부모 창 조작 차단
          const protectionScript = `
            <script>
              (function() {
                // 부모/최상위 창 접근 차단
                try {
                  Object.defineProperty(window, 'parent', { value: window, writable: false });
                  Object.defineProperty(window, 'top', { value: window, writable: false });
                } catch(e) {}
                
                // document.documentElement.classList 조작 차단
                try {
                  const origAdd = document.documentElement.classList.add.bind(document.documentElement.classList);
                  const origRemove = document.documentElement.classList.remove.bind(document.documentElement.classList);
                  const origToggle = document.documentElement.classList.toggle.bind(document.documentElement.classList);
                  
                  document.documentElement.classList.add = function(...args) {
                    const safe = args.filter(c => c !== 'dark' && c !== 'light');
                    if (safe.length > 0) origAdd(...safe);
                  };
                  document.documentElement.classList.remove = function(...args) {
                    const safe = args.filter(c => c !== 'dark' && c !== 'light');
                    if (safe.length > 0) origRemove(...safe);
                  };
                  document.documentElement.classList.toggle = function(token, force) {
                    if (token === 'dark' || token === 'light') return false;
                    return origToggle(token, force);
                  };
                } catch(e) {}
                
                // localStorage 접근 차단 (다크모드 감지 방지)
                try {
                  const fakeStorage = {
                    getItem: () => null,
                    setItem: () => {},
                    removeItem: () => {},
                    clear: () => {},
                    key: () => null,
                    length: 0
                  };
                  Object.defineProperty(window, 'localStorage', { value: fakeStorage, writable: false });
                } catch(e) {}
                
                // matchMedia 다크모드 감지 차단
                const origMatchMedia = window.matchMedia;
                window.matchMedia = function(query) {
                  if (query.includes('prefers-color-scheme')) {
                    return { matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} };
                  }
                  return origMatchMedia ? origMatchMedia.call(window, query) : { matches: false, media: query };
                };
              })();
            </script>
          `;
          
          let processed = rawHtml
            // 인라인 이벤트 핸들러 제거 (onclick, onload, onerror 등)
            .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
            .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')
            // javascript: 프로토콜 제거
            .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
            // <html> 태그의 dark/light 클래스 충돌 정리 및 light 강제
            .replace(/<html([^>]*?)class\s*=\s*["']([^"']*?)(light\s+dark|dark\s+light)([^"']*?)["']/gi, '<html$1class="$2light$4"')
            .replace(/<html([^>]*?)class\s*=\s*["']([^"']*?)\bdark\b([^"']*?)["']/gi, '<html$1class="$2$3"');
          
          // <head> 태그 시작 직후에 보호 스크립트 주입 (가장 먼저 실행되도록)
          if (processed.includes('<head>')) {
            processed = processed.replace('<head>', '<head>' + protectionScript);
          } else if (processed.includes('<head ')) {
            processed = processed.replace(/<head([^>]*)>/, '<head$1>' + protectionScript);
          } else {
            // <head>가 없으면 <html> 직후에 추가
            processed = processed.replace(/<html([^>]*)>/i, '<html$1><head>' + protectionScript + '</head>');
          }
          
          return processed;
        };
        
        const safeHtml = sanitizeHtmlForThumbnail(html);
        
        // 격리된 숨겨진 컨테이너 생성
        tempContainer = document.createElement('div');
        tempContainer.style.cssText = `
          position: fixed;
          left: -99999px;
          top: -99999px;
          width: 1440px;
          height: 900px;
          overflow: hidden;
          visibility: hidden;
          pointer-events: none;
          z-index: -99999;
        `;
        document.body.appendChild(tempContainer);

        // 격리된 iframe 생성
        // allow-same-origin: contentDocument 접근 허용 (html2canvas에 필요)
        // allow-scripts: Tailwind CDN 스크립트 실행 허용 (CSS 적용에 필요)
        const tempIframe = document.createElement('iframe');
        tempIframe.style.cssText = `
          width: 1440px;
          height: 900px;
          border: none;
          background: white;
        `;
        tempIframe.sandbox.add('allow-same-origin'); // contentDocument 접근 허용
        tempIframe.sandbox.add('allow-scripts'); // CSS 생성 스크립트 실행 허용
        tempContainer.appendChild(tempIframe);

        // iframe 로드 대기 (타임아웃 포함)
        const loadPromise = new Promise<void>((loadResolve, loadReject) => {
          const loadTimeout = setTimeout(() => loadReject(new Error('iframe load timeout')), 8000);
          tempIframe.onload = () => {
            clearTimeout(loadTimeout);
            loadResolve();
          };
          tempIframe.onerror = () => {
            clearTimeout(loadTimeout);
            loadReject(new Error('iframe load error'));
          };
          tempIframe.srcdoc = safeHtml;
        });

        try {
          await loadPromise;
        } catch (loadError) {
          console.warn('[Thumbnail] iframe load failed:', loadError);
          resolve(null);
          return;
        }

        // 렌더링 완료 대기 (이미지, 폰트 로드 등)
        await new Promise(r => setTimeout(r, 1500));

        // iframe 내부 document 접근
        let iframeDoc: Document | null = null;
        try {
          iframeDoc = tempIframe.contentDocument || tempIframe.contentWindow?.document || null;
        } catch (accessError) {
          console.warn('[Thumbnail] Cannot access iframe document:', accessError);
          resolve(null);
          return;
        }

        if (!iframeDoc || !iframeDoc.body) {
          console.warn('[Thumbnail] Iframe document not available');
          resolve(null);
          return;
        }

        console.log('[Thumbnail] iframe document ready, starting capture...');

        // html2canvas로 캡처 (타임아웃 적용)
        const capturePromise = html2canvas(iframeDoc.body, {
          width: 1440,
          height: 900,
          scale: 0.25, // 360x225 썸네일
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          foreignObjectRendering: false,
          imageTimeout: 5000, // 이미지 로드 타임아웃
        });

        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Thumbnail capture timeout')), 15000);
        });

        const canvas = await Promise.race([capturePromise, timeoutPromise]);
        if (canvas && typeof canvas.toDataURL === 'function') {
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
          console.log('[Thumbnail] Capture successful, size:', thumbnailUrl.length);
          resolve(thumbnailUrl);
        } else {
          console.warn('[Thumbnail] Canvas not generated');
          resolve(null);
        }
      } catch (error) {
        console.error('[Thumbnail] Error capturing:', error);
        resolve(null);
      } finally {
        // 임시 컨테이너 정리
        if (tempContainer && tempContainer.parentNode) {
          try {
            document.body.removeChild(tempContainer);
          } catch (cleanupError) {
            console.warn('[Thumbnail] Cleanup error:', cleanupError);
          }
        }
      }
    });
  }, [nodes]);

  const handleSendMessage = async (content: string, images: string[], model: ModelType) => {
    // #region agent log
    console.log('[DEBUG EditorPage] handleSendMessage called:', { content: content.substring(0, 50), hasImages: images.length > 0, selectedNodeId });
    fetch('http://127.0.0.1:7242/ingest/e37886a5-8a1f-45f7-8dd2-22bae65fe9fd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EditorPage.tsx:handleSendMessage:entry',message:'handleSendMessage called',data:{content:content.substring(0,50),hasImages:images.length>0,selectedNodeId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // 🔒 크레딧 체크: 생성 전에 먼저 확인
    if (!hasEnoughCredits('generate')) {
      console.warn('[Credits] Not enough credits to generate');
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: Role.MODEL,
        content: '❌ 크레딧이 부족합니다. 더 많은 크레딧을 얻으려면 플랜을 업그레이드하세요.',
        timestamp: Date.now()
      }]);
      return; // 생성 중단
    }
    
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
       // #region agent log
       console.log('[DEBUG EditorPage] Modifying existing node:', { targetNodeId, hasPreviousCode: !!previousCode, previousCodeLength: previousCode?.length || 0 });
       fetch('http://127.0.0.1:7242/ingest/e37886a5-8a1f-45f7-8dd2-22bae65fe9fd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EditorPage.tsx:handleSendMessage:modifyExisting',message:'Modifying existing node',data:{targetNodeId,hasPreviousCode:!!previousCode,previousCodeLength:previousCode?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
       // #endregion
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
         
         const extractedHtml = extractHtml(fullResponse);
         // #region agent log
         if (fullResponse.length < 200 || fullResponse.length % 1000 < 50) {
           console.log('[DEBUG EditorPage] Streaming update:', { targetNodeId, fullResponseLength: fullResponse.length, extractedHtmlLength: extractedHtml.length, extractedHtmlStart: extractedHtml.substring(0, 100), hasDoctype: extractedHtml.includes('<!DOCTYPE') });
           fetch('http://127.0.0.1:7242/ingest/e37886a5-8a1f-45f7-8dd2-22bae65fe9fd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EditorPage.tsx:handleSendMessage:streamUpdate',message:'Streaming update',data:{targetNodeId,fullResponseLength:fullResponse.length,extractedHtmlLength:extractedHtml.length,extractedHtmlStart:extractedHtml.substring(0,100),hasDoctype:extractedHtml.includes('<!DOCTYPE')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
         }
         // #endregion
         
         setNodes(currentNodes => currentNodes.map(n => 
           n.id === targetNodeId 
             ? { ...n, html: extractedHtml } 
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

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e37886a5-8a1f-45f7-8dd2-22bae65fe9fd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EditorPage.tsx:handleSendMessage:finalNode',message:'Setting final node',data:{targetNodeId,cleanHtmlLength:cleanHtml.length,hasDoctype:cleanHtml.includes('<!DOCTYPE'),hasClosingHtml:cleanHtml.includes('</html>')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

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
          // 노드가 렌더링된 후 썸네일 캡처 (격리된 환경에서 안전하게)
          const captureWithSafety = async () => {
            try {
              // cleanHtml을 직접 전달하여 현재 메인 페이지 iframe에 의존하지 않음
              const thumbnail = await captureNodeThumbnail(targetNodeId, cleanHtml);
              if (thumbnail) {
                console.log('[EditorPage] Updating project thumbnail');
                updateProjectThumbnail(thumbnail);
              }
            } catch (thumbnailError) {
              console.warn('[EditorPage] Thumbnail capture failed, skipping:', thumbnailError);
              // 썸네일 캡처 실패해도 앱은 계속 동작
            }
          };
          
          // 2초 후 안전하게 캡처 시도 (격리된 환경이므로 대기 시간 단축)
          setTimeout(() => {
            // requestIdleCallback이 있으면 사용, 없으면 바로 실행
            if ('requestIdleCallback' in window) {
              (window as any).requestIdleCallback(captureWithSafety, { timeout: 5000 });
            } else {
              captureWithSafety();
            }
          }, 2000);
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
                // 크레딧은 Supabase에서 관리되므로 토큰 사용량만 표시
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

  // 초기값들을 ref로 저장 (의존성 배열에서 제외하기 위함)
  const initialPromptRef = useRef(initialPrompt);
  const initialImagesRef = useRef(initialImages);
  const initialModelTypeRef = useRef(initialModelType);

  // 초기 프롬프트가 있으면 자동으로 생성 시작 (마운트 시 한 번만)
  useEffect(() => {
    const prompt = initialPromptRef.current;
    const images = initialImagesRef.current;
    const modelType = initialModelTypeRef.current;
    
    if (prompt && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      
      // 약간의 딜레이 후 생성 시작 (cleanup에서 취소하지 않음)
      setTimeout(() => {
        if (handleSendMessageRef.current) {
          handleSendMessageRef.current(prompt, images, modelType || 'fast');
        }
      }, 300);
    }
  }, []); // 빈 의존성 배열 - 마운트 시 한 번만 실행

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

    // 🔒 크레딧 체크: 변종 생성 전에 먼저 확인
    if (!hasEnoughCredits('variant')) {
      console.warn('[Credits] Not enough credits to create variant');
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: Role.MODEL,
        content: '❌ 크레딧이 부족합니다. 더 많은 크레딧을 얻으려면 플랜을 업그레이드하세요.',
        timestamp: Date.now()
      }]);
      return; // 생성 중단
    }

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
                // 크레딧은 Supabase에서 관리되므로 토큰 사용량만 표시
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

    // 🔒 크레딧 체크: 변종 생성 전에 먼저 확인
    if (!hasEnoughCredits('variant')) {
      console.warn('[Credits] Not enough credits to create variant');
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: Role.MODEL,
        content: '❌ 크레딧이 부족합니다. 더 많은 크레딧을 얻으려면 플랜을 업그레이드하세요.',
        timestamp: Date.now()
      }]);
      return; // 생성 중단
    }
    
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
                // 크레딧은 Supabase에서 관리되므로 토큰 사용량만 표시
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

