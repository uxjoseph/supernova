import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Project, CanvasNode } from '../types/database';
import type { DesignNode } from '../types';

// Debounce helper
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface UseProjectReturn {
  project: Project | null;
  projects: Project[];
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  createProject: (name?: string) => Promise<Project | null>;
  loadProject: (projectId: string) => Promise<void>;
  updateProjectName: (name: string) => Promise<void>;
  updateProjectThumbnail: (thumbnailUrl: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  loadProjects: () => Promise<void>;
  saveNode: (node: DesignNode, projectId?: string) => void;
  saveNodes: (nodes: DesignNode[], projectId?: string) => void;
  saveNodeImmediate: (node: DesignNode, projectId: string) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  loadNodes: () => Promise<DesignNode[]>;
  setProject: (project: Project | null) => void;
}

export const useProject = (): UseProjectReturn => {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const pendingSaves = useRef<Map<string, DesignNode>>(new Map());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load user's projects
  const loadProjects = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data as Project[]);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Create a new project
  const createProject = useCallback(async (name = 'Untitled Project'): Promise<Project | null> => {
    if (!user || !isSupabaseConfigured()) {
      // Demo mode: create local project
      const demoProject: Project = {
        id: `demo-${Date.now()}`,
        user_id: 'demo',
        name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProject(demoProject);
      return demoProject;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({ user_id: user.id, name })
        .select()
        .single();

      if (error) throw error;
      
      const newProject = data as Project;
      setProject(newProject);
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load a specific project
  const loadProject = useCallback(async (projectId: string) => {
    if (!user || !isSupabaseConfigured()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data as Project);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Update project name
  const updateProjectName = useCallback(async (name: string) => {
    const projectId = currentProjectIdRef.current || project?.id;
    if (!projectId || !isSupabaseConfigured()) {
      console.warn('[useProject] Cannot update name: no project ID');
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({ name })
        .eq('id', projectId);

      if (error) throw error;
      
      console.log('[useProject] Project name updated:', name);
      setProject(prev => prev ? { ...prev, name } : null);
      setProjects(prev => 
        prev.map(p => p.id === projectId ? { ...p, name } : p)
      );
    } catch (error) {
      console.error('Error updating project name:', error);
    }
  }, [project]);

  // Update project thumbnail
  const updateProjectThumbnail = useCallback(async (thumbnailUrl: string) => {
    const projectId = currentProjectIdRef.current || project?.id;
    if (!projectId || !isSupabaseConfigured()) {
      console.warn('[useProject] Cannot update thumbnail: no project ID');
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', projectId);

      if (error) {
        // thumbnail_url 컬럼이 없을 수 있음 - 무시하고 계속
        console.warn('[useProject] Thumbnail update skipped (column may not exist):', error.message);
        return;
      }
      
      console.log('[useProject] Thumbnail updated for project:', projectId);
      setProject(prev => prev ? { ...prev, thumbnail_url: thumbnailUrl } : null);
      setProjects(prev => 
        prev.map(p => p.id === projectId ? { ...p, thumbnail_url: thumbnailUrl } : p)
      );
    } catch (error) {
      // 에러가 나도 무시 - 썸네일은 필수가 아님
      console.warn('[useProject] Thumbnail update error (ignored):', error);
    }
  }, [project]);

  // Delete a project
  const deleteProject = useCallback(async (projectId: string) => {
    if (!isSupabaseConfigured()) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (project?.id === projectId) {
        setProject(null);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  }, [project]);

  // Convert DesignNode to CanvasNode for database
  const designNodeToCanvasNode = (node: DesignNode, projectId: string): Omit<CanvasNode, 'created_at' | 'updated_at'> => ({
    id: node.id,
    project_id: projectId,
    type: node.type as 'component' | 'image' | 'note',
    title: node.title,
    html: node.html || null,
    image_url: node.imageUrl || null,
    content: node.content || null,
    color: node.color || null,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  });

  // Convert CanvasNode to DesignNode for app
  const canvasNodeToDesignNode = (node: CanvasNode): DesignNode => ({
    id: node.id,
    type: node.type as 'component' | 'image' | 'note',
    title: node.title || '',
    html: node.html || undefined,
    imageUrl: node.image_url || undefined,
    content: node.content || undefined,
    color: node.color || undefined,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  });

  // Current project ID ref for async operations
  const currentProjectIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    currentProjectIdRef.current = project?.id || null;
  }, [project]);

  // Batch save pending nodes
  const flushPendingSaves = useCallback(async (overrideProjectId?: string) => {
    const projectId = overrideProjectId || currentProjectIdRef.current;
    if (!projectId || pendingSaves.current.size === 0 || !isSupabaseConfigured()) return;

    const nodesToSave = Array.from(pendingSaves.current.values());
    pendingSaves.current.clear();

    setIsSaving(true);
    try {
      const canvasNodes = nodesToSave.map(node => designNodeToCanvasNode(node, projectId));
      
      const { error } = await supabase
        .from('canvas_nodes')
        .upsert(canvasNodes, { onConflict: 'id' });

      if (error) throw error;
      
      setLastSaved(new Date());
      console.log('[useProject] Saved nodes:', nodesToSave.length);
    } catch (error) {
      console.error('Error saving nodes:', error);
      // Re-add failed nodes to pending
      nodesToSave.forEach(node => pendingSaves.current.set(node.id, node));
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Debounced save trigger
  const debouncedFlush = useMemo(
    () => debounce(() => flushPendingSaves(), 1000),
    [flushPendingSaves]
  );

  // Save a single node (debounced)
  const saveNode = useCallback((node: DesignNode, projectId?: string) => {
    const pid = projectId || currentProjectIdRef.current;
    if (!pid) {
      console.warn('[useProject] Cannot save node: no project ID');
      return;
    }
    
    pendingSaves.current.set(node.id, node);
    if (projectId) {
      // If explicit projectId provided, flush immediately with that ID
      flushPendingSaves(projectId);
    } else {
      debouncedFlush();
    }
  }, [debouncedFlush, flushPendingSaves]);

  // Save multiple nodes
  const saveNodes = useCallback((nodes: DesignNode[], projectId?: string) => {
    const pid = projectId || currentProjectIdRef.current;
    if (!pid) {
      console.warn('[useProject] Cannot save nodes: no project ID');
      return;
    }
    
    nodes.forEach(node => pendingSaves.current.set(node.id, node));
    if (projectId) {
      flushPendingSaves(projectId);
    } else {
      debouncedFlush();
    }
  }, [debouncedFlush, flushPendingSaves]);

  // Save a node immediately (for critical saves)
  const saveNodeImmediate = useCallback(async (node: DesignNode, projectId: string) => {
    if (!isSupabaseConfigured()) return;

    setIsSaving(true);
    try {
      const canvasNode = designNodeToCanvasNode(node, projectId);
      
      const { error } = await supabase
        .from('canvas_nodes')
        .upsert(canvasNode, { onConflict: 'id' });

      if (error) throw error;
      
      setLastSaved(new Date());
      console.log('[useProject] Immediate save successful for node:', node.id);
    } catch (error) {
      console.error('Error saving node immediately:', error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Delete a node
  const deleteNode = useCallback(async (nodeId: string) => {
    if (!project || !isSupabaseConfigured()) return;

    // Remove from pending saves if exists
    pendingSaves.current.delete(nodeId);

    try {
      const { error } = await supabase
        .from('canvas_nodes')
        .delete()
        .eq('id', nodeId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  }, [project]);

  // Load all nodes for current project
  const loadNodes = useCallback(async (): Promise<DesignNode[]> => {
    if (!project || !isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('canvas_nodes')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      return (data as CanvasNode[]).map(canvasNodeToDesignNode);
    } catch (error) {
      console.error('Error loading nodes:', error);
      return [];
    }
  }, [project]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Final flush of pending saves
      if (pendingSaves.current.size > 0) {
        flushPendingSaves();
      }
    };
  }, [flushPendingSaves]);

  return {
    project,
    projects,
    isLoading,
    isSaving,
    lastSaved,
    createProject,
    loadProject,
    updateProjectName,
    updateProjectThumbnail,
    deleteProject,
    loadProjects,
    saveNode,
    saveNodes,
    saveNodeImmediate,
    deleteNode,
    loadNodes,
    setProject,
  };
};

export default useProject;

