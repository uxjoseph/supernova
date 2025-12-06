import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Plus, Zap, Component, Brain, CheckCircle2, Loader2, ChevronDown, ChevronRight, FileJson, FileCode, FileText, X, Image as ImageIcon, Atom, Package, FileType, Settings2, Wrench, ArrowLeft, Wand2, Layout, Home, Settings, Edit2, PanelLeftClose } from 'lucide-react';
import { Message, Role, DesignNode, GenerationSection, FileArtifact, VariantCreationState, VARIANT_QUICK_TAGS, SelectedElement } from '../types';
import { ModelType } from '../services/geminiService';

interface SidebarProps {
  width: number;
  onResizeStart: () => void;
  messages: Message[];
  nodes: DesignNode[];
  onSendMessage: (message: string, images: string[], model: ModelType) => void;
  isGenerating: boolean;
  onFocusNode: (id: string) => void;
  onNewChat: () => void;
  selectedNodeId: string | null;
  onClearSelection: () => void;
  variantState?: VariantCreationState;
  onCancelVariant?: () => void;
  onCreateVariant?: (prompt: string, model: ModelType) => void;
  selectedElement?: SelectedElement | null;
  onClearSelectedElement?: () => void;
  projectName?: string;
  onRenameProject?: (name: string) => void;
  onToggleSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  width,
  onResizeStart,
  messages, 
  nodes, 
  onSendMessage, 
  isGenerating, 
  onFocusNode, 
  onNewChat,
  selectedNodeId,
  onClearSelection,
  variantState,
  onCancelVariant,
  onCreateVariant,
  selectedElement,
  onClearSelectedElement,
  projectName = 'Untitled Project',
  onRenameProject,
  onToggleSidebar
}) => {
  const [input, setInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [timeThinking, setTimeThinking] = useState(0);
  const [selectedModel, setSelectedModel] = useState<ModelType>('fast');
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Project Menu State
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editingName, setEditingName] = useState('');
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setShowProjectMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when renaming starts
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      setEditingName(projectName);
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming, projectName]);

  const handleRenameSubmit = () => {
    if (editingName.trim() && onRenameProject) {
      onRenameProject(editingName.trim());
    }
    setIsRenaming(false);
    setShowProjectMenu(false);
  };

  const [variantPrompt, setVariantPrompt] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, nodes]);

  // 변종 상태가 바뀔 때 로컬 상태 초기화
  useEffect(() => {
    if (variantState?.isActive) {
      setVariantPrompt('');
      setSelectedTags([]);
    }
  }, [variantState?.isActive]);

  // 태그 토글
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId) 
        : [...prev, tagId]
    );
  };

  // 변종 생성 핸들러
  const handleVariantSubmit = () => {
    if (!onCreateVariant) return;
    
    // 선택된 태그의 프롬프트 조합
    const tagPrompts = selectedTags
      .map(id => VARIANT_QUICK_TAGS.find(t => t.id === id)?.prompt)
      .filter(Boolean)
      .join(' ');
    
    const fullPrompt = `${tagPrompts} ${variantPrompt}`.trim();
    if (!fullPrompt) return;
    
    onCreateVariant(fullPrompt, selectedModel);
  };

  // Thinking Timer Logic
  useEffect(() => {
    if (isGenerating) {
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setTimeThinking((Date.now() - startTime) / 1000);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeThinking(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedImages.length > 0) && !isGenerating) {
      onSendMessage(input, selectedImages, selectedModel);
      setInput('');
      setSelectedImages([]);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so the same file can be selected again
    if (e.target) e.target.value = '';
  };

  // Handle paste event for images (supports multiple)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const newImages: string[] = [];
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
            setSelectedImages(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        }
        // Don't break - continue to check for more images
      }
    }
    
    // Prevent default only if we found at least one image
    if (imageFound) {
      e.preventDefault();
    }
  };

  // Handle drag and drop for images (supports multiple files)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setSelectedImages(prev => [...prev, reader.result as string]);
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

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  // File icon helper
  const getFileIcon = (path: string) => {
    if (path.endsWith('.json')) return <FileJson size={14} className="text-yellow-500" />;
    if (path.endsWith('.tsx')) return <Atom size={14} className="text-blue-500" />;
    if (path.endsWith('.ts')) return <FileCode size={14} className="text-blue-400" />;
    if (path.endsWith('.md')) return <FileType size={14} className="text-gray-400" />;
    return <FileText size={14} className="text-gray-400" />;
  };

  // Section row component with smooth animations
  const SectionRow = ({ 
    icon, 
    label, 
    status, 
    duration, 
    isExpandable = false,
    isExpanded = false,
    onToggle,
    children
  }: {
    icon: React.ReactNode;
    label: string;
    status: 'pending' | 'active' | 'completed';
    duration?: number;
    isExpandable?: boolean;
    isExpanded?: boolean;
    onToggle?: () => void;
    children?: React.ReactNode;
  }) => (
    <div className="transition-all duration-300">
      <div 
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
          isExpandable ? 'cursor-pointer hover:bg-gray-50' : ''
        } ${status === 'active' ? 'bg-gray-50/50' : ''}`}
        onClick={onToggle}
      >
        {/* Status indicator with smooth transitions */}
        <div className="flex-shrink-0 w-5 flex justify-center items-center">
          {status === 'pending' && (
            <div className="w-2 h-2 rounded-full bg-gray-200 transition-all duration-300" />
          )}
          {status === 'active' && (
            <div className="relative w-4 h-4">
              {/* Subtle pulsing dot instead of spinning */}
              <div className="absolute inset-0 rounded-full bg-gray-300 animate-pulse" />
              <div className="absolute inset-[2px] rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '150ms' }} />
            </div>
          )}
          {status === 'completed' && (
            <CheckCircle2 size={16} className="text-green-500 transition-all duration-300" />
          )}
        </div>

        {/* Icon */}
        <div className={`flex-shrink-0 transition-colors duration-300 ${
          status === 'active' ? 'text-gray-600' : 'text-gray-400'
        }`}>
          {icon}
        </div>

        {/* Label */}
        <span className={`flex-1 text-sm font-medium transition-colors duration-300 ${
          status === 'completed' ? 'text-gray-800' : 
          status === 'active' ? 'text-gray-700' : 'text-gray-400'
        }`}>
          {label}
        </span>

        {/* Duration or expand arrow */}
        {isExpandable && (
          <div className="flex items-center gap-2">
            {duration && <span className="text-xs text-gray-400 tabular-nums">{(duration / 1000).toFixed(0)}s</span>}
            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>
        )}
      </div>
      {children && isExpanded && (
        <div className="ml-8 pl-3 border-l border-gray-100 transition-all duration-300">
          {children}
        </div>
      )}
    </div>
  );

  // File row component with smooth animations
  const FileRow = ({ file }: { file: FileArtifact }) => (
    <div className={`flex items-center gap-2.5 py-2 px-3 rounded-lg mb-1.5 transition-all duration-300 ${
      file.status === 'generating' ? 'bg-blue-50/50' : 'bg-gray-50'
    }`}>
      {/* File icon */}
      <div className={`flex-shrink-0 p-1.5 rounded border transition-colors duration-300 ${
        file.status === 'generating' ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100'
      }`}>
        {getFileIcon(file.path)}
      </div>
      
      {/* File path */}
      <span className="flex-1 text-sm font-mono text-gray-700 truncate">
        {file.path}
      </span>
      
      {/* Status badge */}
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors duration-300 ${
        file.type === 'new' ? 'text-gray-500' : 
        file.type === 'modified' ? 'text-amber-600' : 'text-red-500'
      }`}>
        ({file.type})
      </span>
      
      {/* Lines added with smooth number transition */}
      {file.linesAdded !== undefined && file.linesAdded > 0 && (
        <span className="text-xs text-green-600 font-medium tabular-nums min-w-[40px] text-right transition-all duration-300">
          +{file.linesAdded}
        </span>
      )}
      
      {/* Status icon with smooth transitions */}
      <div className="flex-shrink-0 w-5 flex justify-center items-center">
        {file.status === 'pending' && (
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 transition-all duration-300" />
        )}
        {file.status === 'generating' && (
          <div className="relative w-4 h-4">
            {/* Slow pulsing animation with custom keyframes */}
            <div 
              className="absolute inset-0 rounded-full border-2 border-blue-500" 
              style={{ animation: 'deep-pulse 2s ease-in-out infinite' }}
            />
            <div 
              className="absolute inset-[3px] rounded-full bg-blue-500" 
              style={{ animation: 'deep-pulse 2s ease-in-out infinite', animationDelay: '0.3s' }}
            />
          </div>
        )}
        {file.status === 'completed' && (
          <CheckCircle2 size={14} className="text-green-500 animate-in zoom-in duration-200" />
        )}
      </div>
    </div>
  );

  const GenerationProcess = React.memo(({ msg }: { msg: Message }) => {
    const sections = msg.generationSections || [];
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['think2']));

    const toggleSection = (id: string) => {
      setExpandedSections(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    if (sections.length === 0) return null;

    const resultSection = sections.find(s => s.type === 'result' && s.status === 'completed');

    return (
      <div className="w-full mb-4 space-y-1">
        {sections.map((section) => {
          if (section.type === 'thinking') {
            const isExpanded = expandedSections.has(section.id);
            return (
              <SectionRow
                key={section.id}
                icon={<Brain size={16} />}
                label={`${section.duration ? Math.round(section.duration / 1000) : timeThinking.toFixed(0)}초 동안 생각 중`}
                status={section.status}
                isExpandable={true}
                isExpanded={isExpanded}
                onToggle={() => toggleSection(section.id)}
              />
            );
          }

          if (section.type === 'action') {
            return (
              <SectionRow
                key={section.id}
                icon={section.id === 'create' ? <Plus size={16} /> : <Wrench size={16} />}
                label={section.label}
                status={section.status}
              />
            );
          }

          if (section.type === 'files' && section.files) {
            const hasActiveOrCompleted = section.status === 'active' || section.status === 'completed';
            if (!hasActiveOrCompleted) return null;

            return (
              <div key={section.id} className="py-1 space-y-1">
                {section.files.map(file => (
                  <FileRow key={file.id} file={file} />
                ))}
              </div>
            );
          }

          if (section.type === 'result' && section.status === 'completed') {
            return null; // Rendered separately below
          }

          return null;
        })}

        {/* Result Summary */}
        {resultSection && (
          <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-sm text-gray-800 leading-relaxed mb-3">
              {resultSection.resultSummary}
            </p>
            {resultSection.features && resultSection.features.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">구현된 기능:</p>
                <ul className="space-y-1.5">
                  {resultSection.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span><strong className="text-gray-800">{feature.split(':')[0]}</strong>{feature.includes(':') ? ':' + feature.split(':').slice(1).join(':') : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  });

  return (
    <div 
      className="flex flex-col h-full border-r border-gray-200 bg-white flex-shrink-0 z-20 shadow-sm relative group/sidebar"
      style={{ width }}
    >
      <style>{`
        @keyframes deep-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(0.85); }
        }
      `}</style>
      {/* Resize Handle */}
      <div
        className="absolute -right-1 top-0 w-2 h-full cursor-col-resize z-50 hover:bg-indigo-500/10 transition-colors"
        onMouseDown={onResizeStart}
      />

      {/* App Header */}
      <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4 bg-white flex-shrink-0 z-30">
        <div className="relative" ref={projectMenuRef}>
          {isRenaming ? (
             <div className="flex items-center gap-2.5">
               <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-md">
                 <Zap size={18} fill="currentColor" />
               </div>
               <input
                ref={renameInputRef}
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') setIsRenaming(false);
                }}
                onBlur={handleRenameSubmit}
                className="font-bold text-gray-900 text-sm bg-gray-50 border border-blue-500 rounded px-2 py-1 focus:outline-none w-[180px]"
              />
             </div>
          ) : (
            <>
            <button 
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              className={`flex items-center gap-2.5 p-1 -ml-1 rounded-lg transition-colors text-left group ${showProjectMenu ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
               <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-all">
                 <Zap size={18} fill="currentColor" />
               </div>
               <div>
                 <h1 className="font-bold text-gray-900 text-sm leading-tight tracking-tight flex items-center gap-1">
                   {projectName}
                   <ChevronDown size={12} className={`text-gray-400 transition-transform ${showProjectMenu ? 'rotate-180' : ''}`} />
                 </h1>
                 <span className="text-[10px] text-gray-400 font-medium block">v1.0.4</span>
               </div>
            </button>

            {/* Dropdown Menu */}
            {showProjectMenu && (
              <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="p-1">
                  <button 
                    onClick={() => {
                      setShowProjectMenu(false);
                      // Navigate to Dashboard (Placeholder)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Home size={16} className="text-gray-400" />
                    대시보드로 돌아가기
                  </button>
                  <button 
                    onClick={() => {
                      setShowProjectMenu(false);
                      // Open Settings (Placeholder)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Settings size={16} className="text-gray-400" />
                    설정하기
                  </button>
                  <div className="h-px bg-gray-100 my-1" />
                  <button 
                    onClick={() => {
                      setIsRenaming(true);
                      setShowProjectMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} className="text-gray-400" />
                    프로젝트 이름 바꾸기
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>
        <div className="flex gap-1">
          <button 
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-50 rounded-md text-gray-400 hover:text-gray-900 transition-colors"
            title="사이드바 접기"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      </div>

      {/* Layers / Components Section */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-white max-h-[150px] overflow-y-auto">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">페이지</h2>
            <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 rounded">{nodes.length}</span>
          </div>
          <div className="space-y-1">
             {nodes.length === 0 && (
                <div className="text-xs text-gray-400 italic py-2">생성된 페이지 없음</div>
             )}
             {nodes.map((node, idx) => (
                <button 
                  key={node.id}
                  onClick={() => onFocusNode(node.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-md text-sm transition-colors group text-left ${selectedNodeId === node.id ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}`}
                >
                    <Component size={14} className={selectedNodeId === node.id ? "text-black" : "text-gray-400"} />
                    <span className="flex-1 font-medium truncate">{node.title}</span>
                    <span className="text-[10px] text-gray-300 border border-gray-100 px-1 rounded min-w-[20px] text-center">
                      {idx + 1}
                    </span>
                </button>
             ))}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide bg-gray-50/30" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="mt-12 px-2 text-center">
             <div className="w-12 h-12 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-indigo-500" size={20} />
             </div>
             <h3 className="font-semibold text-gray-900 mb-2">무엇을 만들어볼까요?</h3>
             <p className="text-sm text-gray-500 leading-relaxed max-w-[240px] mx-auto">
               랜딩 페이지, 대시보드, 로그인 페이지 등을 디자인할 수 있습니다.
             </p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === Role.USER ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            {msg.role !== Role.USER && (
               <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold mt-1 flex-shrink-0">
                 S
               </div>
            )}

            <div className={`flex flex-col max-w-[90%] ${msg.role === Role.USER ? 'items-end' : 'items-start'}`}>
              
              {/* User Image Attachments - 여러 이미지 지원 */}
              {(msg.imageUrls && msg.imageUrls.length > 0) ? (
                 <div className="mb-2 flex flex-wrap gap-1.5">
                   {msg.imageUrls.map((url, idx) => (
                     <div key={idx} className="relative p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                       <img src={url} alt={`Reference ${idx + 1}`} className="w-14 h-14 object-cover rounded-md" />
                       {msg.imageUrls!.length > 1 && (
                         <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[8px] px-1 rounded">
                           {idx + 1}
                         </span>
                       )}
                     </div>
                   ))}
                 </div>
              ) : msg.imageUrl && (
                 <div className="mb-2 p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                   <img src={msg.imageUrl} alt="Attached" className="max-w-[150px] max-h-[150px] object-cover rounded-md" />
                 </div>
              )}

              {/* Generation Process UI */}
              {msg.generationSections && msg.generationSections.length > 0 && (
                 <GenerationProcess msg={msg} />
              )}

              {/* Message Content */}
              {msg.content && (
                <div className={`text-sm leading-relaxed py-2 px-3 shadow-sm ${
                  msg.role === Role.USER 
                    ? 'bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-tr-sm' 
                    : 'bg-transparent text-gray-800 px-0 shadow-none'
                }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 변종 만들기 UI */}
      {variantState?.isActive && (
        <div className="p-4 bg-white border-t border-gray-100 z-10 animate-in slide-in-from-bottom-4 duration-300">
          {/* 헤더 */}
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={onCancelVariant}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white shadow-md">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">변종 만들기</h3>
                <p className="text-[11px] text-violet-600 font-medium">
                  Based on {variantState.sourceNodeTitle}
                </p>
              </div>
            </div>
          </div>

          {/* 설명 입력 */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">변형에 대한 설명을 입력하세요</label>
            <textarea
              value={variantPrompt}
              onChange={(e) => setVariantPrompt(e.target.value)}
              placeholder="예: 다크 테마로 변경하고, 히어로 섹션에 애니메이션 추가..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none h-24 placeholder-gray-400 leading-relaxed transition-all"
              disabled={isGenerating}
            />
          </div>

          {/* 빠른 태그 */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {VARIANT_QUICK_TAGS.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTags.includes(tag.id)
                      ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* 원본 정보 */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-4 px-1">
            <div className="flex items-center gap-1.5">
              <Layout size={12} />
              <span>원본 페이지 기반으로 새로운 변형이 우측에 생성됩니다</span>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={onCancelVariant}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleVariantSubmit}
              disabled={(!variantPrompt.trim() && selectedTags.length === 0) || isGenerating}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
                (variantPrompt.trim() || selectedTags.length > 0) && !isGenerating
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isGenerating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Wand2 size={16} />
              )}
              <span>변형 생성</span>
            </button>
          </div>

          {/* 모델 선택 */}
          <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => setSelectedModel('fast')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${selectedModel === 'fast' ? 'bg-violet-50 text-violet-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Zap size={12} className={selectedModel === 'fast' ? "fill-violet-600" : ""} />
              <span>Fast</span>
            </button>
            <div className="w-px h-3 bg-gray-200" />
            <button
              onClick={() => setSelectedModel('pro')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${selectedModel === 'pro' ? 'bg-violet-50 text-violet-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Brain size={12} className={selectedModel === 'pro' ? "text-violet-600" : ""} />
              <span>Pro</span>
            </button>
          </div>
        </div>
      )}

      {/* 기본 Input Area */}
      {!variantState?.isActive && (
        <div className="p-4 bg-white border-t border-gray-100 z-10">
          {/* 선택된 노드 표시 */}
          {selectedNode && (
            <div className="flex items-center justify-between bg-white border border-gray-200 shadow-sm rounded-xl px-4 py-3 mb-3 animate-in slide-in-from-bottom-2 fade-in group relative overflow-hidden">
               <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-1.5 bg-gray-100 rounded-lg text-gray-900">
                     <Component size={14} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Editing Page</span>
                     <span className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">{selectedNode.title}</span>
                  </div>
               </div>
               <button 
                 onClick={onClearSelection}
                 className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                 title="선택 해제"
               >
                  <X size={16} />
               </button>
            </div>
          )}
          
          {/* 선택된 요소 정보 표시 */}
          {selectedElement && selectedNode && (
            <div className="mb-3 p-0 bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 group relative">
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-gray-100 rounded-lg text-gray-900">
                        <Wand2 size={14} strokeWidth={2.5} />
                      </div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Target Element</span>
                    </div>
                    <div className="space-y-1.5 pl-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-gray-400">TAG</span>
                        <code className="text-[11px] bg-gray-50 text-gray-900 px-2 py-0.5 rounded-md font-mono font-semibold border border-gray-200">&lt;{selectedElement.tagName.toLowerCase()}&gt;</code>
                      </div>
                      {selectedElement.text && (
                        <div className="flex items-start gap-2 mt-2">
                            <span className="text-[11px] font-medium text-gray-400 mt-0.5 shrink-0">TEXT</span>
                            <p className="text-xs text-gray-600 line-clamp-2 font-medium leading-relaxed bg-gray-50 px-2 py-1.5 rounded-md border border-gray-100 w-full">
                                "{selectedElement.text.substring(0, 80)}{selectedElement.text.length > 80 ? '...' : ''}"
                            </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={onClearSelectedElement}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                    title="요소 선택 해제"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 px-3.5 py-2 border-t border-gray-100 flex items-center gap-2">
                <Sparkles size={10} className="text-gray-500" />
                <p className="text-[10px] font-medium text-gray-500">
                  선택된 요소만 부분적으로 수정됩니다
                </p>
              </div>
            </div>
          )}
          
          {/* 참조 이미지 미리보기 */}
          {selectedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative group/img">
                  <img 
                    src={img} 
                    alt={`Reference ${idx + 1}`} 
                    className="h-14 w-14 object-cover rounded-lg border border-gray-200 shadow-sm" 
                  />
                  <button 
                    onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full p-0.5 shadow-md hover:bg-gray-800 transition-colors opacity-0 group-hover/img:opacity-100"
                  >
                    <X size={10} />
                  </button>
                  {selectedImages.length > 1 && (
                    <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[8px] px-1 rounded">
                      {idx + 1}
                    </span>
                  )}
                </div>
              ))}
              {selectedImages.length > 1 && (
                <button
                  onClick={() => setSelectedImages([])}
                  className="h-14 px-3 flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-red-300 hover:text-red-400 hover:bg-red-50 transition-colors text-xs"
                  title="모든 이미지 삭제"
                >
                  <X size={12} />
                  <span>전체 삭제</span>
                </button>
              )}
            </div>
          )}

          {/* 입력 영역 */}
          <div 
            className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm hover:border-gray-300 focus-within:border-indigo-400 focus-within:shadow-lg focus-within:ring-4 focus-within:ring-indigo-50 transition-all overflow-hidden"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {/* 텍스트 입력 */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              onPaste={handlePaste}
              placeholder={selectedElement ? `선택된 <${selectedElement.tagName.toLowerCase()}>를 어떻게 수정할까요?` : selectedNode ? "선택된 페이지를 어떻게 수정할까요?" : "원하는 디자인을 설명해주세요..."}
              className="w-full bg-transparent border-none px-4 pt-4 pb-2 text-sm focus:outline-none resize-none min-h-[56px] max-h-32 placeholder-gray-400 leading-relaxed"
              disabled={isGenerating}
            />
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              className="hidden" 
            />
            
            {/* 하단 액션 바 */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/50">
              {/* 왼쪽: 이미지 첨부 + 모델 선택 */}
              <div className="flex items-center gap-1">
                <button 
                  onClick={triggerFileInput}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  title="이미지 첨부 (Ctrl+V)"
                >
                  <ImageIcon size={16} />
                </button>
                
                <div className="w-px h-4 bg-gray-200 mx-1" />
                
                <button
                  onClick={() => setSelectedModel('fast')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedModel === 'fast' 
                      ? 'bg-indigo-100 text-indigo-600' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Zap size={11} className={selectedModel === 'fast' ? "fill-indigo-600" : ""} />
                  <span>2.0</span>
                </button>
                <button
                  onClick={() => setSelectedModel('pro')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedModel === 'pro' 
                      ? 'bg-violet-100 text-violet-600' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Brain size={11} />
                  <span>3.0</span>
                </button>
              </div>

              {/* 오른쪽: 전송 버튼 */}
              <button
                onClick={handleSubmit}
                disabled={(!input.trim() && selectedImages.length === 0) || isGenerating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  (input.trim() || selectedImages.length > 0) && !isGenerating
                    ? 'bg-black text-white hover:bg-gray-800 shadow-sm' 
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-white rounded-full animate-spin"/>
                ) : (
                  <Send size={12} />
                )}
                <span>생성</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
