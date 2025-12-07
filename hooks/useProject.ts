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
  deleteProject: (projectId: string) => Promise<void>;
  loadProjects: () => Promise<void>;
  saveNode: (node: DesignNode) => void;
  saveNodes: (nodes: DesignNode[]) => void;
  deleteNode: (nodeId: string) => Promise<void>;
  loadNodes: () => Promise<DesignNode[]>;
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
    if (!project || !isSupabaseConfigured()) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ name })
        .eq('id', project.id);

      if (error) throw error;
      
      setProject(prev => prev ? { ...prev, name } : null);
      setProjects(prev => 
        prev.map(p => p.id === project.id ? { ...p, name } : p)
      );
    } catch (error) {
      console.error('Error updating project name:', error);
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

  // Batch save pending nodes
  const flushPendingSaves = useCallback(async () => {
    if (!project || pendingSaves.current.size === 0 || !isSupabaseConfigured()) return;

    const nodesToSave = Array.from(pendingSaves.current.values());
    pendingSaves.current.clear();

    setIsSaving(true);
    try {
      const canvasNodes = nodesToSave.map(node => designNodeToCanvasNode(node, project.id));
      
      const { error } = await supabase
        .from('canvas_nodes')
        .upsert(canvasNodes, { onConflict: 'id' });

      if (error) throw error;
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving nodes:', error);
      // Re-add failed nodes to pending
      nodesToSave.forEach(node => pendingSaves.current.set(node.id, node));
    } finally {
      setIsSaving(false);
    }
  }, [project]);

  // Debounced save trigger
  const debouncedFlush = useMemo(
    () => debounce(flushPendingSaves, 1000),
    [flushPendingSaves]
  );

  // Save a single node (debounced)
  const saveNode = useCallback((node: DesignNode) => {
    if (!project) return;
    
    pendingSaves.current.set(node.id, node);
    debouncedFlush();
  }, [project, debouncedFlush]);

  // Save multiple nodes
  const saveNodes = useCallback((nodes: DesignNode[]) => {
    if (!project) return;
    
    nodes.forEach(node => pendingSaves.current.set(node.id, node));
    debouncedFlush();
  }, [project, debouncedFlush]);

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
    deleteProject,
    loadProjects,
    saveNode,
    saveNodes,
    deleteNode,
    loadNodes,
  };
};

export default useProject;

