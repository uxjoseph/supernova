import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MousePointer2, Hand, ZoomIn, ZoomOut, Layout, Code, GripVertical, Layers, Pin, RefreshCw, 
  Edit3, Link as LinkIcon, Play, MoreHorizontal, ChevronDown, Download, Smartphone, Tablet, Monitor,
  Copy, Check, FileCode, CheckCircle2, ExternalLink, Image as ImageIcon, Loader2, Sparkles, X, Send, Plus,
  History, RotateCw, StickyNote, Type, Component as ComponentIcon, LayoutGrid, Zap, Share2, Globe, Link2
} from 'lucide-react';
import { DesignNode, PreviewTab, SelectedElement, NodeType } from '../types';
import { PublishedPage } from '../types/database';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { publishPage, unpublishPage, getPublishStatus, getPublicUrl } from '../services/publishService';
import { useAuth } from '../contexts/AuthContext';

// Preview Tab Content Component
interface PreviewTabContentProps {
  node: DesignNode;
  onCopyToFigma: () => void;
  onDownloadZip: () => void;
}

const PreviewTabContent: React.FC<PreviewTabContentProps> = ({ node, onCopyToFigma, onDownloadZip }) => {
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Close export menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const viewportWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px'
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([node.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = node.html;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100">
      {/* Preview Toolbar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
        {/* Left: Title */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">{node.title}</span>
          <span className="text-xs text-gray-400 font-mono">{node.width} × {node.height}</span>
        </div>
        
        {/* Center: Device Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('mobile')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'mobile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            title="모바일 보기"
          >
            <Smartphone size={16} />
          </button>
          <button
            onClick={() => setViewMode('tablet')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'tablet' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            title="태블릿 보기"
          >
            <Tablet size={16} />
          </button>
          <button
            onClick={() => setViewMode('desktop')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'desktop' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            title="데스크톱 보기"
          >
            <Monitor size={16} />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Refresh */}
          <button 
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
            title="새로고침"
          >
            <RotateCw size={16} />
          </button>

          {/* Version History (Placeholder) */}
          <button 
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
            title="버전 히스토리 (준비 중)"
          >
            <History size={16} />
          </button>

          {/* Code View */}
          <button 
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
            title="코드 보기"
          >
            <Code size={16} />
          </button>

          {/* Open in New Tab */}
          <button 
            onClick={handleOpenInNewTab}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
            title="새 탭에서 열기"
          >
            <ExternalLink size={16} />
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showExportMenu ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <Download size={14} />
              <span>Export</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>
            
            {showExportMenu && (
              <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                <div className="p-1">
                  {/* Figma Copy */}
                  <button 
                    onClick={() => {
                      onCopyToFigma();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                      <Copy size={14} />
                    </div>
                    <div className="flex-1">
                      <span className="block font-semibold">Figma에 붙여넣기</span>
                      <span className="text-[10px] text-gray-400 font-normal">HTML 코드 복사</span>
                    </div>
                  </button>
                  
                  <div className="h-px bg-gray-100 my-1" />
                  
                  {/* ZIP Download */}
                  <button 
                    onClick={() => {
                      onDownloadZip();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                      <FileCode size={14} />
                    </div>
                    <div>
                      <span className="block">ZIP 다운로드</span>
                      <span className="text-[10px] text-gray-400 font-normal">HTML, CSS 소스코드</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Preview Content */}
      <div className={`flex-1 overflow-auto flex items-start justify-center ${viewMode === 'desktop' ? 'bg-white' : 'bg-gray-100 p-6'}`}>
        <div 
          className={`bg-white overflow-hidden transition-all duration-300 ${
            viewMode === 'desktop' 
              ? 'w-full h-full' 
              : 'shadow-2xl rounded-lg border border-gray-200'
          }`}
          style={{ 
            width: viewMode === 'desktop' ? '100%' : viewportWidths[viewMode],
            maxWidth: viewMode === 'desktop' ? '100%' : '100%',
            height: viewMode === 'desktop' ? '100%' : 'auto',
            minHeight: viewMode !== 'desktop' ? '80vh' : undefined
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={node.html}
            className="w-full h-full border-none"
            style={{ minHeight: viewMode === 'desktop' ? '100%' : '80vh' }}
            title={`preview-${node.id}`}
          />
        </div>
      </div>
    </div>
  );
};

interface CanvasProps {
  nodes: DesignNode[];
  isLoading: boolean;
  focusTrigger: { id: string, timestamp: number } | null;
  onUpdateNode: (node: DesignNode) => void;
  onAddNode?: (node: DesignNode) => void;
  onDeleteNode?: (nodeId: string) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onOpenPreviewTab?: (nodeId: string) => void;
  onStartVariant?: (nodeId: string) => void;
  onCreateVariant?: (nodeId: string, prompt: string) => void;
  // 미리보기 탭 관련
  previewTabs?: PreviewTab[];
  activeTab?: string;
  onSetActiveTab?: (tab: string) => void;
  onClosePreviewTab?: (nodeId: string) => void;
  // 요소 선택 관련
  onSelectElement?: (element: SelectedElement | null) => void;
  // 퍼블리시 관련
  projectId?: string;
  userId?: string;
}

type Tool = 'select' | 'hand';
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const Canvas: React.FC<CanvasProps> = ({ 
  nodes, 
  isLoading, 
  focusTrigger, 
  onUpdateNode,
  onAddNode,
  onDeleteNode,
  selectedNodeId,
  onSelectNode,
  onOpenPreviewTab,
  onStartVariant,
  onCreateVariant,
  previewTabs = [],
  activeTab = 'canvas',
  onSetActiveTab,
  onClosePreviewTab,
  onSelectElement,
  projectId,
  userId
}) => {
  const [scale, setScale] = useState(0.8);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState<Tool>('select');
  
  // Dragging State
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Resizing State
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, nodeX: 0, nodeY: 0 });

  // Export Menu State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCopyingImage, setIsCopyingImage] = useState(false);

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareStatus, setShareStatus] = useState<PublishedPage | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const shareModalRef = useRef<HTMLDivElement>(null);

  // Create Variant State (handled by Sidebar now)
  // const [showVariantModal, setShowVariantModal] = useState(false);
  // const [variantDescription, setVariantDescription] = useState('');
  // const [variantBaseNode, setVariantBaseNode] = useState<DesignNode | null>(null);

  // Element Editing State
  const [selectedElement, setSelectedElement] = useState<{
    id: string;
    tagName: string;
    text: string;
    rect: DOMRect;
    styles: any;
    nodeId: string;
  } | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Node Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  // Node Dragging State (for moving nodes within canvas)
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, nodeX: 0, nodeY: 0 });

  // Add Menu State (+ 버튼 드롭다운)
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());

  // 완성된 HTML 캐시 - 깜빡임 방지를 위해 완성된 HTML만 저장
  const [completedHtmlCache, setCompletedHtmlCache] = useState<Map<string, string>>(new Map());

  // Store current scale and position in refs for native event handler
  const scaleRef = useRef(scale);
  const positionRef = useRef(position);

  // Listen for messages from iframes
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'elementSelected') {
        const { id, tagName, text, rect, nodeId, className, outerHtml } = event.data;
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            // 노드도 함께 선택
            if (selectedNodeId !== nodeId) {
              onSelectNode(nodeId);
            }
            
            setSelectedElement({
                id, tagName, text, rect, styles: {}, nodeId
            });
            setEditValue(text || '');
            
            // 부모(App)에게 선택된 요소 정보 전달 (AI 수정용)
            onSelectElement?.({
              id,
              nodeId,
              tagName,
              text: text?.substring(0, 200) || '',
              className: className || '',
              outerHtml: outerHtml?.substring(0, 500) || ''
            });
            
            console.log('Element selected:', { id, tagName, text: text?.substring(0, 50), nodeId });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [nodes, onSelectElement, selectedNodeId, onSelectNode]);

  // Update iframe state when node selection changes
  useEffect(() => {
    // If no node is selected, clear element selection
    if (!selectedNodeId) {
      setSelectedElement(null);
      onSelectElement?.(null);
      
      // Clear selection in all iframes
      nodes.forEach(node => {
        const iframe = iframeRefs.current.get(node.id);
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'clearSelection' }, '*');
        }
      });
    }
    
    // Reset title editing state when selection changes
    setIsEditingTitle(false);
    setEditingTitleValue('');
  }, [selectedNodeId, nodes, onSelectElement]);

  // HTML이 렌더링 가능한지 확인 (최소한의 구조가 있는지)
  const canRenderHtml = (html: string): boolean => {
    if (!html || html.length < 30) return false;
    const lowerHtml = html.toLowerCase();
    // <body 태그가 시작되면 렌더링 시작 (생성 과정을 보여주기 위해)
    return lowerHtml.includes('<body') || lowerHtml.includes('<html') || lowerHtml.includes('<!doctype');
  };

  // HTML이 완전히 생성되었는지 확인
  const isHtmlComplete = (html: string): boolean => {
    if (!html || html.length < 50) return false;
    const lowerHtml = html.toLowerCase();
    return lowerHtml.includes('</html>') || lowerHtml.includes('</body>');
  };

  // 완성된 HTML을 캐시에 저장 (깜빡임 방지)
  useEffect(() => {
    nodes.forEach(node => {
      if (node.type === 'component' && node.html && isHtmlComplete(node.html)) {
        setCompletedHtmlCache(prev => {
          const newCache = new Map(prev);
          // 새로운 완성된 HTML이 기존과 다를 때만 업데이트
          if (newCache.get(node.id) !== node.html) {
            newCache.set(node.id, node.html);
          }
          return newCache;
        });
      }
    });
  }, [nodes]);

  // 노드별로 표시할 HTML 결정 (완성된 것 또는 캐시된 것)
  const getDisplayHtml = (node: DesignNode): string | null => {
    if (!node.html) return null;
    
    // HTML이 완성되었으면 현재 HTML 사용
    if (isHtmlComplete(node.html)) {
      return node.html;
    }
    
    // 완성되지 않았으면 캐시된 완성 버전 사용 (있으면)
    const cachedHtml = completedHtmlCache.get(node.id);
    if (cachedHtml) {
      return cachedHtml;
    }
    
    // 캐시도 없으면 null (스켈레톤 표시)
    return null;
  };

  // Inject interaction script into HTML
  const getInteractableHtml = (html: string, nodeId: string) => {
    const script = `
      <script>
        (function() {
          let hoveredElement = null;
          let selectedElement = null;
          
          // 항상 호버 효과 활성화
          document.addEventListener('mouseover', (e) => {
            e.stopPropagation();
            const target = e.target;
            if (target === document.body || target === document.documentElement) return;
            if (target.tagName === 'SCRIPT' || target.tagName === 'STYLE') return;
            
            if (hoveredElement && hoveredElement !== selectedElement) {
              hoveredElement.style.outline = '';
              hoveredElement.style.outlineOffset = '';
            }
            hoveredElement = target;
            if (target !== selectedElement) {
              target.style.outline = '2px dashed #3b82f6';
              target.style.outlineOffset = '-2px';
            }
            target.style.cursor = 'pointer';
          });

          document.addEventListener('mouseout', (e) => {
            if (e.target === hoveredElement && e.target !== selectedElement) {
              e.target.style.outline = '';
              e.target.style.outlineOffset = '';
              hoveredElement = null;
            }
          });

          document.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const target = e.target;
            if (target === document.body || target === document.documentElement) return;
            if (target.tagName === 'SCRIPT' || target.tagName === 'STYLE') return;

            // 이전 선택 해제
            if (selectedElement) {
              selectedElement.style.outline = '';
              selectedElement.style.outlineOffset = '';
            }
            
            // 새 요소 선택
            selectedElement = target;
            target.style.outline = '3px solid #8b5cf6';
            target.style.outlineOffset = '-3px';

            // Generate a unique ID if not present
            if (!target.id) {
                target.id = 'el-' + Math.random().toString(36).substr(2, 9);
            }

            const rect = target.getBoundingClientRect();
            window.parent.postMessage({
              type: 'elementSelected',
              nodeId: '${nodeId}',
              id: target.id,
              tagName: target.tagName,
              text: target.innerText ? target.innerText.substring(0, 200) : '',
              className: target.className || '',
              outerHtml: target.outerHTML ? target.outerHTML.substring(0, 500) : '',
              rect: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
              }
            }, '*');
          });

          // Listen for updates from parent
          window.addEventListener('message', (e) => {
            if (e.data.type === 'updateElement') {
               const { id, text, styles } = e.data;
               const el = document.getElementById(id);
               if (el) {
                   if (text !== undefined) el.innerText = text;
                   if (styles) {
                       Object.assign(el.style, styles);
                   }
               }
            } else if (e.data.type === 'clearSelection') {
                if (selectedElement) {
                    selectedElement.style.outline = '';
                    selectedElement.style.outlineOffset = '';
                    selectedElement = null;
                }
            }
          });
        })();
      </script>
    `;
    return html + script;
  };
  
  // Toggle Editing Mode
  const toggleEditingMode = () => {
    const newMode = !isEditingMode;
    setIsEditingMode(newMode);
    setSelectedElement(null);
    onSelectElement?.(null);
    
    // Notify all iframes
    iframeRefs.current.forEach((iframe) => {
        iframe.contentWindow?.postMessage({
            type: 'setEditingMode',
            isEditing: newMode
        }, '*');
    });
  };

  const handleElementUpdate = (newText: string) => {
     if (!selectedElement) return;
     
     // 1. Update local iframe immediately for feedback
     const iframe = iframeRefs.current.get(selectedElement.nodeId);
     iframe?.contentWindow?.postMessage({
         type: 'updateElement',
         id: selectedElement.id,
         text: newText
     }, '*');
     
     setEditValue(newText);
  };
  
  const applyElementUpdate = () => {
      if (!selectedElement) return;
      
      const node = nodes.find(n => n.id === selectedElement.nodeId);
      if (node) {
          // Naive HTML update - in real app, use a proper parser or just rely on the iframe's current state if we were persisting the iframe's DOM
          // Here we'll just update the text content for the regex approach or similar
          // For now, since we manipulated the DOM inside iframe, we could extract the innerHTML from iframe
          
          const iframe = iframeRefs.current.get(selectedElement.nodeId);
          if (iframe && iframe.contentDocument) {
              // Get full HTML from iframe
              const newHtml = iframe.contentDocument.documentElement.outerHTML;
              onUpdateNode({ ...node, html: newHtml });
          }
      }
      setSelectedElement(null);
      onSelectElement?.(null);
  };

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Native wheel event handler for preventing browser zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // Always prevent default to stop browser zoom
      e.preventDefault();
      e.stopPropagation();
      
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Detect pinch zoom (ctrlKey is set by trackpad pinch gestures)
      if (e.ctrlKey || e.metaKey) {
        // Pinch zoom - use deltaY for zoom amount
        // Trackpad pinch typically has smaller deltaY values
        const isPinch = Math.abs(e.deltaY) < 50; // Heuristic for pinch vs scroll
        const zoomSensitivity = isPinch ? 0.015 : 0.001;
        
        const delta = -e.deltaY * zoomSensitivity;
        const currentScale = scaleRef.current;
        // Use exponential scaling for smoother zoom feel
        const newScale = Math.min(Math.max(0.1, currentScale * (1 + delta)), 4);
        
        // Calculate position adjustment to keep mouse point stable
        const scaleRatio = newScale / currentScale;
        const currentPos = positionRef.current;
        const newX = mouseX - (mouseX - currentPos.x) * scaleRatio;
        const newY = mouseY - (mouseY - currentPos.y) * scaleRatio;

        setScale(newScale);
        setPosition({ x: newX, y: newY });
      } else {
        // Normal scroll/pan - smooth two-finger scroll
        const currentPos = positionRef.current;
        setPosition({
          x: currentPos.x - e.deltaX,
          y: currentPos.y - e.deltaY
        });
      }
    };

    // Use native event listener with passive: false to enable preventDefault
    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  // Prevent browser zoom on the entire document when hovering over canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Prevent default zoom behavior on document level when pointer is over canvas
    const preventBrowserZoom = (e: WheelEvent) => {
      if ((e.ctrlKey || e.metaKey) && container.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    // Handle keyboard zoom shortcuts (Ctrl/Cmd + +/-/0)
    const preventKeyboardZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        if (container.matches(':hover') || container.contains(document.activeElement)) {
          e.preventDefault();
          
          // Apply zoom to canvas instead
          const currentScale = scaleRef.current;
          if (e.key === '+' || e.key === '=') {
            setScale(Math.min(4, currentScale * 1.1));
          } else if (e.key === '-') {
            setScale(Math.max(0.1, currentScale / 1.1));
          } else if (e.key === '0') {
            setScale(1);
          }
        }
      }
    };

    document.addEventListener('wheel', preventBrowserZoom, { passive: false });
    document.addEventListener('keydown', preventKeyboardZoom);
    
    return () => {
      document.removeEventListener('wheel', preventBrowserZoom);
      document.removeEventListener('keydown', preventKeyboardZoom);
    };
  }, []);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
      if (shareModalRef.current && !shareModalRef.current.contains(event.target as Node)) {
        setShowShareModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 전체 페이지 정렬 핸들러
  const handleArrangeAllPages = () => {
    if (nodes.length === 0) return;
    
    const GAP = 100; // 노드 사이 간격
    const PADDING = 50; // 캔버스 여백
    
    // 노드들을 가로로 정렬
    let currentX = PADDING;
    const updatedNodes = nodes.map((node, index) => {
      const newNode = { ...node, x: currentX, y: PADDING };
      currentX += node.width + GAP;
      return newNode;
    });
    
    // 노드 업데이트
    updatedNodes.forEach(node => {
      onUpdateNode(node);
    });
    
    // 전체 레이아웃이 보이도록 스케일과 위치 조정
    const totalWidth = currentX - GAP + PADDING;
    const maxHeight = Math.max(...nodes.map(n => n.height)) + PADDING * 2;
    
    const container = containerRef.current;
    if (container) {
      const availableWidth = container.clientWidth - 100;
      const availableHeight = container.clientHeight - 100;
      
      // 전체가 보이도록 스케일 계산
      const scaleX = availableWidth / totalWidth;
      const scaleY = availableHeight / maxHeight;
      const newScale = Math.min(scaleX, scaleY, 1); // 최대 1배율
      
      setScale(Math.max(0.1, newScale * 0.9)); // 약간의 여유 공간
      setPosition({ x: 50, y: 50 }); // 왼쪽 상단에서 시작
    }
  };

  // 이미지 추가 핸들러
  const handleAddImage = () => {
    fileInputRef.current?.click();
    setShowAddMenu(false);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      
      // 이미지 원본 크기 가져오기
      const img = new Image();
      img.onload = () => {
        const originalWidth = img.naturalWidth;
        const originalHeight = img.naturalHeight;
        
        // 캔버스 중앙에 이미지 추가 (원본 크기 기준으로 중앙 계산)
        const centerX = containerRef.current ? (containerRef.current.clientWidth / 2 - position.x) / scale - originalWidth / 2 : 100;
        const centerY = containerRef.current ? (containerRef.current.clientHeight / 2 - position.y) / scale - originalHeight / 2 : 100;
        
        const newNode: DesignNode = {
          id: `image-${Date.now()}`,
          type: 'image',
          title: file.name,
          imageUrl: imageUrl,
          x: centerX,
          y: centerY,
          width: originalWidth,
          height: originalHeight
        };
        
        onAddNode?.(newNode);
        onSelectNode(newNode.id);
      };
      img.src = imageUrl;
    };
    reader.readAsDataURL(file);
    
    // 파일 입력 초기화
    e.target.value = '';
  };

  // 스티키 노트 추가 핸들러
  const handleAddNote = () => {
    const centerX = containerRef.current ? (containerRef.current.clientWidth / 2 - position.x) / scale - 100 : 100;
    const centerY = containerRef.current ? (containerRef.current.clientHeight / 2 - position.y) / scale - 100 : 100;
    
    const colors = ['#FEF3C7', '#DBEAFE', '#FCE7F3', '#D1FAE5', '#E9D5FF'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newNode: DesignNode = {
      id: `note-${Date.now()}`,
      type: 'note',
      title: '새 노트',
      content: '',
      color: randomColor,
      x: centerX,
      y: centerY,
      width: 200,
      height: 200
    };
    
    onAddNode?.(newNode);
    onSelectNode(newNode.id);
    setEditingNoteId(newNode.id);
    setEditingNoteContent('');
    setShowAddMenu(false);
  };

  // 노트 내용 저장
  const handleSaveNoteContent = (nodeId: string, content: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      onUpdateNode({ ...node, content });
    }
    setEditingNoteId(null);
  };

  // Toast Timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Focus Logic - nodes 추가하여 노드 생성 후 포커스 동작 보장
  useEffect(() => {
    if (focusTrigger && containerRef.current) {
      const node = nodes.find(n => n.id === focusTrigger.id);
      
      if (node) {
        onSelectNode(node.id); // Also select it
        const { clientWidth, clientHeight } = containerRef.current;
        
        // Calculate fit scale with comfortable padding
        const padding = 100; // More breathing room
        const availableWidth = clientWidth - padding;
        const availableHeight = clientHeight - padding;
        
        const scaleX = availableWidth / node.width;
        const scaleY = availableHeight / node.height;
        
        // Fit entire node into view, max 0.85 to avoid being too overwhelming
        let newScale = Math.min(scaleX, scaleY, 0.85);
        
        // Ensure reasonable limits
        newScale = Math.max(0.1, newScale);
        
        const nodeCenterX = node.x + node.width / 2;
        const nodeCenterY = node.y + node.height / 2;
        
        const newX = clientWidth / 2 - nodeCenterX * newScale;
        const newY = clientHeight / 2 - nodeCenterY * newScale;

        setScale(newScale);
        setPosition({ x: newX, y: newY });
      }
    }
  }, [focusTrigger, nodes]); // nodes 의존성 추가 


  // --- Interaction Handlers ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.canvas-ui')) return;

    if (e.button === 1 || activeTool === 'hand' || e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      e.preventDefault();
      return;
    }

    if (e.button === 0 && activeTool === 'select') {
      const clickedFrame = (e.target as HTMLElement).closest('.design-frame');
      
      if (clickedFrame) {
         const id = clickedFrame.getAttribute('data-id');
         if (id) onSelectNode(id);
      } else {
         onSelectNode(null);
         setIsPanning(true); 
         setPanStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    }
  };

  const handleResizeStart = (e: React.MouseEvent, handle: ResizeHandle, node: DesignNode) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({ 
      x: e.clientX, 
      y: e.clientY, 
      w: node.width, 
      h: node.height, 
      nodeX: node.x, 
      nodeY: node.y 
    });
  };

  // Node drag handler - for moving individual nodes
  const handleNodeDragStart = (e: React.MouseEvent, node: DesignNode) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingNode(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      nodeX: node.x,
      nodeY: node.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle node dragging
    if (isDraggingNode && selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId);
      if (!node) return;

      const deltaX = (e.clientX - dragStart.x) / scale;
      const deltaY = (e.clientY - dragStart.y) / scale;

      onUpdateNode({
        ...node,
        x: dragStart.nodeX + deltaX,
        y: dragStart.nodeY + deltaY
      });
      return;
    }

    if (isPanning) {
      setPosition({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (isResizing && selectedNodeId && resizeHandle) {
      const node = nodes.find(n => n.id === selectedNodeId);
      if (!node) return;

      const deltaX = (e.clientX - resizeStart.x) / scale;
      const deltaY = (e.clientY - resizeStart.y) / scale;

      let newW = resizeStart.w;
      let newH = resizeStart.h;
      let newX = resizeStart.nodeX;
      let newY = resizeStart.nodeY;

      if (resizeHandle.includes('e')) newW = Math.max(320, resizeStart.w + deltaX);
      if (resizeHandle.includes('w')) {
        const proposedW = Math.max(320, resizeStart.w - deltaX);
        newX = resizeStart.nodeX + (resizeStart.w - proposedW);
        newW = proposedW;
      }
      if (resizeHandle.includes('s')) newH = Math.max(200, resizeStart.h + deltaY);
      if (resizeHandle.includes('n')) {
        const proposedH = Math.max(200, resizeStart.h - deltaY);
        newY = resizeStart.nodeY + (resizeStart.h - proposedH);
        newH = proposedH;
      }

      onUpdateNode({ ...node, width: newW, height: newH, x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsResizing(false);
    setResizeHandle(null);
    setIsDraggingNode(false);
  };

  // Title editing handlers
  const handleStartEditingTitle = () => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;
    setEditingTitleValue(node.title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    if (!selectedNodeId || !editingTitleValue.trim()) {
      setIsEditingTitle(false);
      return;
    }
    const node = nodes.find(n => n.id === selectedNodeId);
    if (node) {
      onUpdateNode({ ...node, title: editingTitleValue.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleCancelEditingTitle = () => {
    setIsEditingTitle(false);
    setEditingTitleValue('');
  };

  const setResolution = (w: number, h: number) => {
    if (selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId);
      if (node) onUpdateNode({ ...node, width: w, height: h });
    }
  };

  const handleDownloadZip = async () => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node || !node.html) return;

    try {
        const zip = new JSZip();
        zip.file("index.html", node.html);
        zip.file("package.json", JSON.stringify({
            name: node.title.toLowerCase().replace(/\s+/g, '-'),
            version: "1.0.0",
            description: "Generated by Supanova",
            scripts: {
                "start": "serve"
            }
        }, null, 2));
        zip.file("README.md", `# ${node.title}\n\nGenerated by Supanova.\n\n## Usage\nOpen index.html in your browser.`);

        const content = await zip.generateAsync({ type: "blob" });
        
        // Native download
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${node.title.replace(/\s+/g, '_')}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setShowExportMenu(false);
    } catch (e) {
        console.error("Export failed", e);
        alert("다운로드 중 오류가 발생했습니다.");
    }
  };

  // 공유 모달 열기 (퍼블리시 상태 로드)
  const handleOpenShareModal = async () => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node || !node.html) return;

    setShowShareModal(true);
    setUrlCopied(false);

    // 기존 퍼블리시 상태 확인
    const status = await getPublishStatus(selectedNodeId);
    setShareStatus(status);
    if (status && status.is_published) {
      setShareUrl(getPublicUrl(status.id));
    } else {
      setShareUrl(null);
    }
  };

  // 페이지 퍼블리시/언퍼블리시 토글
  const handleTogglePublish = async () => {
    if (!selectedNodeId || !projectId || !userId) {
      setToastMessage('퍼블리시하려면 로그인이 필요합니다.');
      return;
    }

    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node || !node.html) return;

    setIsPublishing(true);

    try {
      if (shareStatus?.is_published) {
        // 언퍼블리시
        const result = await unpublishPage(selectedNodeId);
        if (result.success) {
          setShareStatus(result.publishedPage || null);
          setShareUrl(null);
          setToastMessage('페이지가 비공개로 전환되었습니다.');
        } else {
          setToastMessage(result.error || '언퍼블리시 실패');
        }
      } else {
        // 퍼블리시
        const result = await publishPage(
          selectedNodeId,
          projectId,
          userId,
          node.title,
          node.html
        );
        if (result.success && result.publishedPage) {
          setShareStatus(result.publishedPage);
          setShareUrl(result.publicUrl || null);
          setToastMessage('페이지가 퍼블리시되었습니다!');
        } else {
          setToastMessage(result.error || '퍼블리시 실패');
        }
      }
    } catch (error: any) {
      console.error('Publish toggle error:', error);
      setToastMessage('오류가 발생했습니다.');
    } finally {
      setIsPublishing(false);
    }
  };

  // 공유 URL 복사
  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setUrlCopied(true);
      setToastMessage('URL이 클립보드에 복사되었습니다!');
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      setToastMessage('URL 복사에 실패했습니다.');
    }
  };

  // HTML을 이미지로 변환하여 클립보드에 복사 (Figma에서 바로 붙여넣기 가능)
  const handleCopyToFigma = async () => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node || !node.html) return;

    setIsCopyingImage(true);
    
    try {
      // 임시 컨테이너 생성
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: ${node.width}px;
        height: ${node.height}px;
        overflow: hidden;
        background: white;
      `;
      document.body.appendChild(tempContainer);

      // iframe 생성 및 HTML 로드
      const tempIframe = document.createElement('iframe');
      tempIframe.style.cssText = `
        width: ${node.width}px;
        height: ${node.height}px;
        border: none;
      `;
      tempContainer.appendChild(tempIframe);

      // iframe에 HTML 로드
      await new Promise<void>((resolve) => {
        tempIframe.onload = () => resolve();
        tempIframe.srcdoc = node.html;
      });

      // 로드 완료 후 약간의 대기 (스타일 적용을 위해)
      await new Promise(r => setTimeout(r, 500));

      // iframe 내부 body를 캡처
      const iframeDoc = tempIframe.contentDocument || tempIframe.contentWindow?.document;
      if (!iframeDoc?.body) {
        throw new Error("iframe document not available");
      }

      // html2canvas로 캡처
      const canvas = await html2canvas(iframeDoc.body, {
        width: node.width,
        height: node.height,
        scale: 2, // 고해상도 캡처
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // 임시 컨테이너 제거
      document.body.removeChild(tempContainer);

      // Canvas를 Blob으로 변환
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to create blob"));
        }, 'image/png', 1.0);
      });

      // 클립보드에 이미지로 복사
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);

      setToastMessage("이미지가 복사되었습니다. Figma에서 Ctrl+V / Cmd+V로 붙여넣으세요!");
      setShowExportMenu(false);
    } catch (e) {
      console.error("Copy to Figma failed", e);
      // Fallback: HTML 코드 복사
      try {
        await navigator.clipboard.writeText(node.html);
        setToastMessage("이미지 복사 실패 - HTML 코드가 복사되었습니다.");
        setShowExportMenu(false);
      } catch {
        alert("복사 중 오류가 발생했습니다.");
      }
    } finally {
      setIsCopyingImage(false);
    }
  };

  // HTML 코드 복사 (개발자용)
  const handleCopyHtmlCode = async () => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node || !node.html) return;

    try {
      await navigator.clipboard.writeText(node.html);
      setToastMessage("HTML 코드가 복사되었습니다.");
      setShowExportMenu(false);
    } catch (e) {
      console.error("Copy failed", e);
      alert("복사 중 오류가 발생했습니다.");
    }
  };

  // Create Variant 핸들러 - Sidebar에서 처리하므로 제거됨
  // const handleOpenVariantModal = (node: DesignNode) => { ... };
  // const handleCloseVariantModal = () => { ... };
  // const handleSubmitVariant = () => { ... };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F9FAFB] relative overflow-hidden font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 fade-in duration-300">
           <div className="bg-gray-900 text-white px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-green-400" />
              <span className="text-sm font-medium">{toastMessage}</span>
           </div>
        </div>
      )}

      {/* Top Tab Bar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between z-20 flex-shrink-0 canvas-ui">
        {/* Tabs */}
        <div className="flex items-center h-full">
          {/* Canvas Tab */}
          <button
            onClick={() => onSetActiveTab?.('canvas')}
            className={`h-full px-4 flex items-center gap-2 text-sm font-medium border-r border-gray-100 transition-colors ${
              activeTab === 'canvas' 
                ? 'bg-white text-gray-900' 
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Layout size={14} className={activeTab === 'canvas' ? 'text-gray-700' : 'text-gray-400'} />
            <span>Canvas</span>
          </button>
          
          {/* Preview Tabs */}
          {previewTabs.map(tab => {
            const node = nodes.find(n => n.id === tab.nodeId);
            return (
              <div
                key={tab.id}
                className={`h-full flex items-center border-r border-gray-100 group ${
                  activeTab === tab.nodeId 
                    ? 'bg-white' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <button
                  onClick={() => onSetActiveTab?.(tab.nodeId)}
                  className={`h-full px-3 flex items-center gap-2 text-sm font-medium transition-colors ${
                    activeTab === tab.nodeId 
                      ? 'text-gray-900' 
                      : 'text-gray-500'
                  }`}
                >
                  <Play size={12} className={activeTab === tab.nodeId ? 'text-green-500' : 'text-gray-400'} />
                  <span className="max-w-[120px] truncate">{tab.title}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClosePreviewTab?.(tab.nodeId);
                  }}
                  className="h-full px-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center gap-3 px-4">
          {activeTab === 'canvas' && (
            <span className="text-xs text-gray-400 w-12 text-right">
              {Math.round(scale * 100)}%
            </span>
          )}
          
          {/* Credit Display in Tab Bar */}
          <TabBarCreditDisplay />
        </div>
      </div>

      {/* Preview Tab Full Screen */}
      {activeTab !== 'canvas' && (
        (() => {
          const previewNode = nodes.find(n => n.id === activeTab);
          if (!previewNode || !previewNode.html) {
            return (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Layout size={48} className="mx-auto mb-4 opacity-50" />
                  <p>컴포넌트를 찾을 수 없습니다</p>
                </div>
              </div>
            );
          }
          return (
            <PreviewTabContent 
              node={previewNode} 
              onCopyToFigma={async () => {
                try {
                  await navigator.clipboard.writeText(previewNode.html);
                  setToastMessage("HTML 코드가 복사되었습니다. Figma에서 붙여넣으세요.");
                } catch {
                  alert("복사 중 오류가 발생했습니다.");
                }
              }}
              onDownloadZip={async () => {
                try {
                  const zip = new JSZip();
                  zip.file("index.html", previewNode.html);
                  zip.file("package.json", JSON.stringify({
                    name: previewNode.title.toLowerCase().replace(/\s+/g, '-'),
                    version: "1.0.0",
                    description: "Generated by Supanova",
                  }, null, 2));
                  zip.file("README.md", `# ${previewNode.title}\n\nGenerated by Supanova.`);
                  const content = await zip.generateAsync({ type: "blob" });
                  const url = URL.createObjectURL(content);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${previewNode.title.replace(/\s+/g, '_')}.zip`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                } catch (e) {
                  console.error("Export failed", e);
                  alert("다운로드 중 오류가 발생했습니다.");
                }
              }}
            />
          );
        })()
      )}

      {/* Infinite Canvas Area */}
      {activeTab === 'canvas' && (
      <div 
        ref={containerRef}
        className={`flex-1 overflow-hidden relative ${
          isDraggingNode ? 'cursor-grabbing' : 
          activeTool === 'hand' || isPanning ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Dot Grid Background */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.3]"
          style={{
            backgroundImage: 'radial-gradient(#94A3B8 1px, transparent 1px)',
            backgroundSize: `${20 * scale}px ${20 * scale}px`,
            backgroundPosition: `${position.x}px ${position.y}px`
          }}
        />

        {/* Canvas World Transform */}
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isPanning || isResizing ? 'none' : 'transform 0.1s linear' // Faster response for zoom
          }}
          className="absolute top-0 left-0"
        >
          {nodes.map(node => {
             const isSelected = selectedNodeId === node.id;
             
             return (
              <div 
                key={node.id}
                data-id={node.id}
                className="absolute design-frame group"
                style={{
                  transform: `translate(${node.x}px, ${node.y}px)`,
                  width: node.width,
                  height: node.height
                }}
              >
                {/* Selection Ring */}
                <div 
                  className={`absolute -inset-0 pointer-events-none transition-all duration-200 ${isSelected ? 'ring-4 ring-black/10 z-10' : 'ring-1 ring-gray-200 hover:ring-gray-300'}`}
                  style={{
                    outline: isSelected ? '2px solid #000' : 'none',
                    outlineOffset: '1px'
                  }}
                />

                {isSelected && !isPanning && (
                  <>
                    {/* Corner Handles */}
                    <div onMouseDown={(e) => handleResizeStart(e, 'nw', node)} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black z-50 shadow-sm cursor-nw-resize canvas-ui rounded-sm hover:scale-125 transition-transform" />
                    <div onMouseDown={(e) => handleResizeStart(e, 'ne', node)} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black z-50 shadow-sm cursor-ne-resize canvas-ui rounded-sm hover:scale-125 transition-transform" />
                    <div onMouseDown={(e) => handleResizeStart(e, 'sw', node)} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black z-50 shadow-sm cursor-sw-resize canvas-ui rounded-sm hover:scale-125 transition-transform" />
                    <div onMouseDown={(e) => handleResizeStart(e, 'se', node)} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black z-50 shadow-sm cursor-se-resize canvas-ui rounded-sm hover:scale-125 transition-transform" />
                    
                    {/* Edge Handles - Visual Bars */}
                    <div onMouseDown={(e) => handleResizeStart(e, 'w', node)} className="absolute top-1/2 -left-2 w-4 h-12 -translate-y-1/2 cursor-w-resize z-40 canvas-ui flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity">
                        <div className="w-1.5 h-8 bg-white border border-gray-200 shadow-sm rounded-full flex items-center justify-center"><div className="w-0.5 h-3 bg-gray-300 rounded-full"/></div>
                    </div>
                    <div onMouseDown={(e) => handleResizeStart(e, 'e', node)} className="absolute top-1/2 -right-2 w-4 h-12 -translate-y-1/2 cursor-e-resize z-40 canvas-ui flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity">
                        <div className="w-1.5 h-8 bg-white border border-gray-200 shadow-sm rounded-full flex items-center justify-center"><div className="w-0.5 h-3 bg-gray-300 rounded-full"/></div>
                    </div>
                    <div onMouseDown={(e) => handleResizeStart(e, 'n', node)} className="absolute -top-2 left-1/2 w-12 h-4 -translate-x-1/2 cursor-n-resize z-40 canvas-ui flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity">
                        <div className="h-1.5 w-8 bg-white border border-gray-200 shadow-sm rounded-full flex items-center justify-center"><div className="h-0.5 w-3 bg-gray-300 rounded-full"/></div>
                    </div>
                    <div onMouseDown={(e) => handleResizeStart(e, 's', node)} className="absolute -bottom-2 left-1/2 w-12 h-4 -translate-x-1/2 cursor-s-resize z-40 canvas-ui flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity">
                         <div className="h-1.5 w-8 bg-white border border-gray-200 shadow-sm rounded-full flex items-center justify-center"><div className="h-0.5 w-3 bg-gray-300 rounded-full"/></div>
                    </div>

                    {/* Invisible Hit Areas for Edges */}
                     <div onMouseDown={(e) => handleResizeStart(e, 'w', node)} className="absolute top-0 -left-2 w-4 h-full cursor-w-resize z-30" />
                     <div onMouseDown={(e) => handleResizeStart(e, 'e', node)} className="absolute top-0 -right-2 w-4 h-full cursor-e-resize z-30" />
                     <div onMouseDown={(e) => handleResizeStart(e, 'n', node)} className="absolute -top-2 left-0 w-full h-4 cursor-n-resize z-30" />
                     <div onMouseDown={(e) => handleResizeStart(e, 's', node)} className="absolute -bottom-2 left-0 w-full h-4 cursor-s-resize z-30" />
                  </>
                )}

               {/* The Content */}
               <div className={`w-full h-full overflow-hidden relative ${node.type === 'note' ? '' : 'bg-white shadow-xl'}`}>
                  {/* 컴포넌트 (HTML) 타입 */}
                  {node.type === 'component' && (
                    <>
                      {(() => {
                        const displayHtml = getDisplayHtml(node);
                        const isGenerating = node.html && !isHtmlComplete(node.html);
                        
                        if (displayHtml) {
                          return (
                            <div className="w-full h-full relative">
                              <iframe 
                                ref={el => {
                                    if (el) iframeRefs.current.set(node.id, el);
                                    else iframeRefs.current.delete(node.id);
                                }}
                                key={`iframe-${node.id}-${isHtmlComplete(node.html || '') ? 'complete' : 'cached'}`}
                                data-node-id={node.id}
                                srcDoc={getInteractableHtml(displayHtml, node.id)}
                                className={`w-full h-full border-none pointer-events-auto transition-opacity duration-300 ${isGenerating ? 'opacity-60' : 'opacity-100'}`}
                                title={`preview-${node.id}`}
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                              />
                              {/* 생성 중 오버레이 */}
                              {isGenerating && (
                                <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center bg-white/20 backdrop-blur-[1px]">
                                  <div className="bg-black/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl flex items-center gap-3 shadow-2xl">
                                    <div className="relative w-5 h-5">
                                      <div className="absolute inset-0 rounded-full border-2 border-white/20"></div>
                                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin"></div>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-semibold">페이지 생성 중</span>
                                      <span className="text-[10px] text-white/60">잠시만 기다려주세요...</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        
                        // 아직 완성된 HTML이 없을 때 - 세련된 스켈레톤 표시
                        return (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400">
                            <div className="relative mb-6">
                              <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center">
                                <Layout size={28} className="text-gray-300" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-black rounded-lg flex items-center justify-center shadow-lg">
                                <div className="w-3 h-3 rounded-full border-2 border-transparent border-t-white animate-spin"></div>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-gray-600 mb-1">페이지 생성 중</span>
                            <span className="text-xs text-gray-400">AI가 코드를 작성하고 있습니다...</span>
                            
                            {/* 진행 바 애니메이션 */}
                            <div className="mt-6 w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-gray-400 to-gray-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                  
                  {/* 이미지 타입 */}
                  {node.type === 'image' && (
                    <div 
                      className={`w-full h-full bg-gray-100 flex items-center justify-center ${isSelected ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                      onMouseDown={(e) => {
                        if (isSelected && e.button === 0) {
                          handleNodeDragStart(e, node);
                        }
                      }}
                      onClick={(e) => {
                        if (!isSelected) {
                          e.stopPropagation();
                          onSelectNode(node.id);
                        }
                      }}
                    >
                      {node.imageUrl ? (
                        <img 
                          src={node.imageUrl} 
                          alt={node.title}
                          className="w-full h-full object-contain pointer-events-none"
                          draggable={false}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                          <ImageIcon size={48} className="mb-2 opacity-50" />
                          <span className="text-sm">이미지 없음</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 스티키 노트 타입 */}
                  {node.type === 'note' && (
                    <div 
                      className="w-full h-full flex flex-col shadow-lg relative"
                      style={{ 
                        backgroundColor: node.color || '#FEF3C7',
                        boxShadow: '4px 4px 10px rgba(0,0,0,0.1)'
                      }}
                    >
                      {/* 노트 상단 드래그 바 */}
                      <div 
                        className="h-6 w-full flex-shrink-0 cursor-grab active:cursor-grabbing flex items-center justify-center border-b border-black/5"
                        onMouseDown={(e) => {
                          if (e.button === 0) {
                            handleNodeDragStart(e, node);
                          }
                        }}
                      >
                        <div className="flex gap-0.5">
                          <div className="w-1 h-1 bg-black/20 rounded-full" />
                          <div className="w-1 h-1 bg-black/20 rounded-full" />
                          <div className="w-1 h-1 bg-black/20 rounded-full" />
                        </div>
                      </div>
                      
                      <div className="flex-1 p-3 overflow-hidden">
                        {editingNoteId === node.id ? (
                          <textarea
                            value={editingNoteContent}
                            onChange={(e) => setEditingNoteContent(e.target.value)}
                            onBlur={() => handleSaveNoteContent(node.id, editingNoteContent)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setEditingNoteId(null);
                              }
                            }}
                            placeholder="노트 내용을 입력하세요..."
                            className="w-full h-full bg-transparent resize-none outline-none text-gray-800 text-sm leading-relaxed"
                            autoFocus
                          />
                        ) : (
                          <div 
                            className="w-full h-full cursor-text text-gray-800 text-sm leading-relaxed overflow-auto whitespace-pre-wrap"
                            onClick={() => {
                              if (isSelected) {
                                setEditingNoteId(node.id);
                                setEditingNoteContent(node.content || '');
                              }
                            }}
                          >
                            {node.content || (
                              <span className="text-gray-500 italic">클릭하여 내용 입력...</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                   {!isSelected && node.type === 'component' && <div className="absolute inset-0 z-30 bg-transparent" />}
                </div>

                {/* Bottom Dimensions Label */}
                {isSelected && (
                  <div 
                    className="absolute -bottom-8 left-1/2 bg-white border border-gray-200 text-gray-600 text-xs font-mono px-2 py-1 rounded-md shadow-sm whitespace-nowrap z-50 pointer-events-none origin-top"
                    style={{
                      transform: `translateX(-50%) scale(${1 / scale})`,
                      marginBottom: `${10 / scale}px` // 줌 아웃 시 겹침 방지 여백 보정
                    }}
                  >
                     {Math.round(node.width)} × {Math.round(node.height)} px
                  </div>
                )}
              </div>
             );
          })}
        </div>

        {/* Selected Node Context UI */}
        {selectedNodeId && nodes.find(n => n.id === selectedNodeId) && (
          <>
             {/* 1. Context Toolbar (Top) */}
             <div 
               className="absolute z-50 canvas-ui"
               style={{ 
                 left: position.x + nodes.find(n => n.id === selectedNodeId)!.x * scale,
                 top: position.y + nodes.find(n => n.id === selectedNodeId)!.y * scale - 64
               }}
             >
                <div className="bg-white shadow-2xl border border-gray-200/60 rounded-xl p-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  {/* Drag Handle for Moving Node */}
                  <div 
                    className="flex items-center gap-2 px-2 pr-3 cursor-grab active:cursor-grabbing hover:bg-gray-50 rounded-lg py-1.5 border-r border-gray-100 mr-1"
                    onMouseDown={(e) => {
                      const node = nodes.find(n => n.id === selectedNodeId);
                      if (node) handleNodeDragStart(e, node);
                    }}
                    title="드래그하여 이동"
                  >
                     <GripVertical size={14} className="text-gray-400" />
                     
                     {/* Title - Click to Edit */}
                     {isEditingTitle ? (
                       <input
                         type="text"
                         value={editingTitleValue}
                         onChange={(e) => setEditingTitleValue(e.target.value)}
                         onKeyDown={(e) => {
                           e.stopPropagation();
                           if (e.key === 'Enter') handleSaveTitle();
                           if (e.key === 'Escape') handleCancelEditingTitle();
                         }}
                         onBlur={handleSaveTitle}
                         onClick={(e) => e.stopPropagation()}
                         onMouseDown={(e) => e.stopPropagation()}
                         className="font-semibold text-sm text-gray-800 bg-gray-100 border border-gray-300 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[100px]"
                         autoFocus
                       />
                     ) : (
                       <span 
                         className="font-semibold text-sm text-gray-800 cursor-text hover:bg-gray-100 px-1 py-0.5 rounded transition-colors"
                         onClick={(e) => {
                           e.stopPropagation();
                           handleStartEditingTitle();
                         }}
                         onMouseDown={(e) => e.stopPropagation()}
                         title="클릭하여 이름 변경"
                       >
                         {nodes.find(n => n.id === selectedNodeId)!.title}
                       </span>
                     )}
                  </div>
                  
                  {/* Component-specific buttons */}
                  {nodes.find(n => n.id === selectedNodeId)?.type === 'component' && (
                    <>
                      <button 
                        onClick={() => {
                          if (selectedNodeId) onStartVariant?.(selectedNodeId);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors" 
                        title="변종만들기"
                      >
                        <Layers size={16} />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors" title="새로고침"><RefreshCw size={16} /></button>
                      <div className="w-px h-4 bg-gray-200 mx-0.5" />
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors" title="코드 보기"><Code size={16} /></button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors" title="편집"><Edit3 size={16} /></button>
                      
                      {/* Share Button with Modal */}
                      <div className="relative" ref={shareModalRef}>
                        <button 
                          onClick={handleOpenShareModal}
                          className={`p-2 rounded-lg transition-colors ${showShareModal ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`} 
                          title="공유하기"
                        >
                          <Share2 size={16} />
                        </button>
                        
                        {/* Share Modal */}
                        {showShareModal && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[70]">
                            {/* Header */}
                            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-blue-100 rounded-lg">
                                    <Globe size={14} className="text-blue-600" />
                                  </div>
                                  <span className="font-semibold text-gray-900 text-sm">페이지 공유</span>
                                </div>
                                <button 
                                  onClick={() => setShowShareModal(false)}
                                  className="p-1 hover:bg-white/50 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                            
                            {/* Content */}
                            <div className="p-4">
                              {/* Publish Toggle */}
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">웹에 공개</p>
                                  <p className="text-xs text-gray-500">누구나 URL로 접근 가능</p>
                                </div>
                                <button
                                  onClick={handleTogglePublish}
                                  disabled={isPublishing || !projectId || !userId}
                                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                                    shareStatus?.is_published 
                                      ? 'bg-blue-600' 
                                      : 'bg-gray-200'
                                  } ${isPublishing ? 'opacity-50' : ''} ${!projectId || !userId ? 'opacity-30 cursor-not-allowed' : ''}`}
                                >
                                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                                    shareStatus?.is_published ? 'translate-x-6' : 'translate-x-0.5'
                                  }`}>
                                    {isPublishing && (
                                      <Loader2 size={12} className="absolute inset-0 m-auto animate-spin text-gray-400" />
                                    )}
                                  </div>
                                </button>
                              </div>
                              
                              {/* URL Section */}
                              {shareStatus?.is_published && shareUrl && (
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">공개 URL</label>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono truncate">
                                      {shareUrl}
                                    </div>
                                    <button
                                      onClick={handleCopyShareUrl}
                                      className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                                        urlCopied 
                                          ? 'bg-green-50 text-green-600' 
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                      title="URL 복사"
                                    >
                                      {urlCopied ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                  </div>
                                  
                                  {/* Open in new tab */}
                                  <a
                                    href={shareUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full mt-3 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                                  >
                                    <ExternalLink size={14} />
                                    새 탭에서 열기
                                  </a>
                                </div>
                              )}
                              
                              {/* Login prompt if not authenticated */}
                              {(!projectId || !userId) && (
                                <div className="text-center py-4">
                                  <p className="text-xs text-gray-500">퍼블리시하려면 로그인이 필요합니다.</p>
                                </div>
                              )}
                              
                              {/* View count */}
                              {shareStatus?.is_published && shareStatus.view_count > 0 && (
                                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                                  <span>조회수</span>
                                  <span className="font-medium">{shareStatus.view_count.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="w-px h-4 bg-gray-200 mx-0.5" />
                      
                      {/* Preview in Tab Button */}
                      <button 
                        onClick={() => onOpenPreviewTab?.(selectedNodeId!)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors group relative"
                        title="새 탭에서 미리보기"
                      >
                        <Play size={14} className="text-green-500" />
                        <span className="text-xs font-medium">Preview</span>
                      </button>
                    </>
                  )}
                  
                  {/* Note-specific buttons - color picker */}
                  {nodes.find(n => n.id === selectedNodeId)?.type === 'note' && (
                    <>
                      <div className="flex items-center gap-1 px-1">
                        {['#FEF3C7', '#DBEAFE', '#FCE7F3', '#D1FAE5', '#E9D5FF'].map(color => (
                          <button
                            key={color}
                            onClick={() => {
                              const node = nodes.find(n => n.id === selectedNodeId);
                              if (node) {
                                onUpdateNode({ ...node, color });
                              }
                            }}
                            className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${nodes.find(n => n.id === selectedNodeId)?.color === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                            title="노트 색상 변경"
                          />
                        ))}
                      </div>
                      <div className="w-px h-4 bg-gray-200 mx-0.5" />
                    </>
                  )}
                  
                  {/* Delete button - for all node types */}
                  <button 
                    onClick={() => {
                      if (selectedNodeId && onDeleteNode) {
                        onDeleteNode(selectedNodeId);
                      }
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors" 
                    title="삭제"
                  >
                    <X size={16} />
                  </button>
                  
                  {/* Export Dropdown - only for component type */}
                  {nodes.find(n => n.id === selectedNodeId)?.type === 'component' && (
                    <div className="relative" ref={exportMenuRef}>
                      <button 
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg font-medium text-xs transition-colors ml-1 ${showExportMenu ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-100 text-gray-700'}`}
                      >
                        <Download size={14} /> 내보내기 <ChevronDown size={12} className="text-gray-400" />
                      </button>
                      
                      {showExportMenu && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                          <div className="p-1">
                            {/* Figma 이미지 복사 (추천) */}
                            <button 
                              onClick={handleCopyToFigma}
                              disabled={isCopyingImage}
                              className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                               <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                                 {isCopyingImage ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                               </div>
                               <div className="flex-1">
                                 <div className="flex items-center gap-1.5">
                                   <span className="block font-semibold">Figma로 복사</span>
                                   <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-semibold">추천</span>
                                 </div>
                                 <span className="text-[10px] text-gray-400 font-normal">
                                   {isCopyingImage ? '이미지 생성 중...' : '이미지로 바로 붙여넣기'}
                                 </span>
                               </div>
                            </button>
                            
                            <div className="h-px bg-gray-100 my-1" />
                            
                            {/* ZIP 다운로드 */}
                            <button 
                              onClick={handleDownloadZip}
                              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                               <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                 <FileCode size={14} />
                               </div>
                               <div>
                                 <span className="block">ZIP 다운로드</span>
                                 <span className="text-[10px] text-gray-400 font-normal">HTML, CSS 소스코드</span>
                               </div>
                            </button>
                            
                            {/* HTML 코드 복사 */}
                            <button 
                              onClick={handleCopyHtmlCode}
                              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                               <div className="p-1.5 bg-gray-100 text-gray-600 rounded-lg">
                                 <Copy size={14} />
                               </div>
                               <div>
                                 <span className="block">HTML 코드 복사</span>
                                 <span className="text-[10px] text-gray-400 font-normal">개발용 소스코드</span>
                               </div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
             </div>

             {/* 2. Resolution Toolbar (Left Side) - Only for component type */}
             {nodes.find(n => n.id === selectedNodeId)?.type === 'component' && (
               <div
                  className="absolute z-50 canvas-ui flex flex-col gap-2"
                  style={{
                    left: position.x + nodes.find(n => n.id === selectedNodeId)!.x * scale - 64,
                    top: position.y + nodes.find(n => n.id === selectedNodeId)!.y * scale,
                  }}
               >
                  <div className="bg-white shadow-xl border border-gray-200 rounded-xl p-1.5 flex flex-col gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
                     <button 
                       onClick={() => setResolution(375, 812)}
                       className={`p-2 rounded-lg transition-colors relative group ${nodes.find(n => n.id === selectedNodeId)!.width === 375 ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                       title="모바일 (375x812)"
                     >
                       <Smartphone size={18} />
                     </button>
                     <button 
                       onClick={() => setResolution(768, 1024)}
                       className={`p-2 rounded-lg transition-colors ${nodes.find(n => n.id === selectedNodeId)!.width === 768 ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                       title="태블릿 (768x1024)"
                     >
                       <Tablet size={18} />
                     </button>
                     <button 
                       onClick={() => setResolution(1440, 900)}
                       className={`p-2 rounded-lg transition-colors ${nodes.find(n => n.id === selectedNodeId)!.width === 1440 ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                       title="데스크탑 (1440x900)"
                     >
                       <Monitor size={18} />
                     </button>
                  </div>
               </div>
             )}
          </>
        )}

      </div>
      )}

        {/* Main Canvas Tools (Bottom Center) - Only show on Canvas tab */}
        {activeTab === 'canvas' && (
        <div className="canvas-ui absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-2 flex items-center gap-1 z-50">
          <button 
            onClick={() => setActiveTool('select')} 
            className={`p-2.5 rounded-xl transition-all duration-200 ${activeTool === 'select' && !isEditingMode ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            title="선택 도구"
          >
            <MousePointer2 size={18} />
          </button>
          <button onClick={() => setActiveTool('hand')} className={`p-2.5 rounded-xl transition-all duration-200 ${activeTool === 'hand' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}><Hand size={18} /></button>
          <div className="w-px h-6 bg-gray-200 mx-2" />
        <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-xl"><ZoomOut size={18} /></button>
        <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-xl"><ZoomIn size={18} /></button>
        <div className="w-px h-6 bg-gray-200 mx-2" />
        <button 
          onClick={handleArrangeAllPages} 
          className="p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-xl"
          title="전체 페이지 정렬"
        >
          <LayoutGrid size={18} />
        </button>
        <button 
          onClick={() => {
            const nodeId = selectedNodeId || (nodes.length > 0 ? nodes[nodes.length - 1].id : null);
            const selectedNode = nodeId ? nodes.find(n => n.id === nodeId) : null;
            if (selectedNode && selectedNode.type === 'component') onStartVariant?.(nodeId!);
          }}
          disabled={nodes.filter(n => n.type === 'component').length === 0}
          className="p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
          title="컴포넌트 변종 만들기"
        >
          <Layers size={18} />
        </button>
        
        {/* + 버튼 드롭다운 */}
        <div className="relative" ref={addMenuRef}>
          <button 
            onClick={() => setShowAddMenu(!showAddMenu)}
            className={`p-2.5 rounded-xl transition-all duration-200 ${showAddMenu ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            title="요소 추가"
          >
            <Plus size={18} />
          </button>
          
          {showAddMenu && (
            <div className="absolute bottom-full mb-2 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[180px] animate-in slide-in-from-bottom-2 duration-200">
              <button 
                onClick={handleAddImage}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <ImageIcon size={18} className="text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">이미지</span>
              </button>
              <button 
                onClick={handleAddNote}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <StickyNote size={18} className="text-amber-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">스티키 노트</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Hidden file input for image upload */}
        <input 
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileChange}
          className="hidden"
        />
      </div>
        )}

      {/* Element Editor Popover */}
      {selectedElement && (
        <div 
            className="absolute z-[60] canvas-ui animate-in fade-in zoom-in-95 duration-200"
            style={{
                left: position.x + (nodes.find(n => n.id === selectedElement.nodeId)?.x || 0) * scale + selectedElement.rect.left * scale,
                top: position.y + (nodes.find(n => n.id === selectedElement.nodeId)?.y || 0) * scale + selectedElement.rect.top * scale - 50
            }}
        >
            <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-2.5 min-w-[280px]">
                <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{selectedElement.tagName}</span>
                    </div>
                    <button onClick={() => { setSelectedElement(null); onSelectElement?.(null); }} className="text-gray-400 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded-md">
                        <X size={14} />
                    </button>
                </div>
                <div className="space-y-2.5">
                    <div className="relative">
                        <input 
                            type="text"
                            value={editValue}
                            onChange={(e) => handleElementUpdate(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyElementUpdate()}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition-all placeholder:text-gray-400"
                            placeholder="텍스트 내용 수정..."
                            autoFocus
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Edit3 size={14} className="text-gray-400" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button 
                            onClick={() => { setSelectedElement(null); onSelectElement?.(null); }}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            취소
                        </button>
                        <button 
                            onClick={applyElementUpdate}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-black hover:bg-gray-800 rounded-lg transition-all shadow-sm hover:shadow flex items-center gap-1.5"
                        >
                            <span>적용</span>
                            <Check size={12} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute top-4 right-4 z-50 canvas-ui">
          <div className="bg-white/90 backdrop-blur border border-indigo-100 shadow-lg px-4 py-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span></span>
            <span className="text-sm font-medium text-indigo-900">페이지 생성 중...</span>
          </div>
        </div>
      )}

    </div>
  );
};

// 탭바에 통합된 크레딧 표시 컴포넌트 (Supabase 연동)
const TabBarCreditDisplay: React.FC = () => {
  const { profile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const credits = profile?.credits_remaining ?? 100;
  const maxCredits = profile?.credits_max ?? 300;
  const usedCredits = maxCredits - credits;
  const usagePercentage = (usedCredits / maxCredits) * 100;
  const isLowCredits = credits < 30;
  const isCriticalCredits = credits < 10;

  return (
    <div ref={menuRef} className="relative">
      {/* 크레딧 버튼 - 탭바 스타일 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-sm ${
          isCriticalCredits 
            ? 'bg-red-50 text-red-700 hover:bg-red-100' 
            : isLowCredits 
              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'hover:bg-gray-100 text-gray-600'
        }`}
      >
        <Zap size={14} className={
          isCriticalCredits ? 'text-red-500 fill-red-500' : 
          isLowCredits ? 'text-amber-500 fill-amber-500' : 
          'text-gray-400'
        } />
        <span className="font-semibold tabular-nums">
          {credits}
        </span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* 확장된 크레딧 패널 */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          {/* 헤더 */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={14} className={
                  isCriticalCredits ? 'text-red-500 fill-red-500' : 
                  isLowCredits ? 'text-amber-500 fill-amber-500' : 
                  'text-gray-500'
                } />
                <span className="text-sm font-semibold text-gray-900">크레딧</span>
              </div>
              <span className="text-xl font-bold tabular-nums text-gray-900">
                {credits}
              </span>
            </div>
          </div>

          {/* 상세 정보 */}
          <div className="p-3 space-y-3">
            {/* 프로그레스 바 */}
            <div>
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>남은 크레딧</span>
                <span>{credits} / {maxCredits}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCriticalCredits ? 'bg-red-500' : 
                    isLowCredits ? 'bg-amber-500' : 
                    'bg-gray-800'
                  }`}
                  style={{ width: `${Math.max(100 - usagePercentage, 0)}%` }}
                />
              </div>
            </div>

            {/* 정책 안내 */}
            <div className="flex flex-col gap-1 text-xs text-gray-500 pt-2 border-t border-gray-100">
              <div className="flex justify-between">
                <span>일일 충전</span>
                <span className="font-medium">100 크레딧</span>
              </div>
              <div className="flex justify-between">
                <span>월 최대</span>
                <span className="font-medium">300 크레딧</span>
              </div>
            </div>

            {/* 경고 메시지 */}
            {isLowCredits && (
              <div className={`px-2.5 py-2 rounded-lg text-xs ${
                isCriticalCredits ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {isCriticalCredits 
                  ? '⚠️ 크레딧이 거의 소진되었습니다'
                  : '💡 크레딧이 부족합니다'
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};