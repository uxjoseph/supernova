// Publish Service - Handle page publishing for public sharing
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { PublishedPage } from '../types/database';

export interface PublishResult {
  success: boolean;
  publishedPage?: PublishedPage;
  publicUrl?: string;
  error?: string;
}

export interface PublishedPageWithNode extends PublishedPage {
  canvas_nodes?: {
    html: string | null;
    title: string | null;
  };
}

// Get the base URL for published pages
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://supernova.app'; // Fallback
};

// Generate public URL for a published page
export const getPublicUrl = (publishId: string): string => {
  return `${getBaseUrl()}/p/${publishId}`;
};

// Publish a page (create or update published_pages record)
export const publishPage = async (
  nodeId: string,
  projectId: string,
  userId: string,
  title: string,
  htmlContent: string
): Promise<PublishResult> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    // Check if page is already published
    const { data: existing, error: checkError } = await supabase
      .from('published_pages')
      .select('*')
      .eq('node_id', nodeId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      throw checkError;
    }

    if (existing) {
      // Update existing published page
      const { data, error } = await supabase
        .from('published_pages')
        .update({
          title,
          html_snapshot: htmlContent,
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        publishedPage: data as PublishedPage,
        publicUrl: getPublicUrl(data.id),
      };
    } else {
      // Create new published page
      const { data, error } = await supabase
        .from('published_pages')
        .insert({
          node_id: nodeId,
          project_id: projectId,
          user_id: userId,
          title,
          html_snapshot: htmlContent,
          is_published: true,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        publishedPage: data as PublishedPage,
        publicUrl: getPublicUrl(data.id),
      };
    }
  } catch (error: any) {
    console.error('[PublishService] Error publishing page:', error);
    return {
      success: false,
      error: error.message || 'Failed to publish page',
    };
  }
};

// Unpublish a page (set is_published to false)
export const unpublishPage = async (nodeId: string): Promise<PublishResult> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('published_pages')
      .update({ is_published: false })
      .eq('node_id', nodeId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      publishedPage: data as PublishedPage,
    };
  } catch (error: any) {
    console.error('[PublishService] Error unpublishing page:', error);
    return {
      success: false,
      error: error.message || 'Failed to unpublish page',
    };
  }
};

// Get published page status for a node
export const getPublishStatus = async (nodeId: string): Promise<PublishedPage | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('published_pages')
      .select('*')
      .eq('node_id', nodeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No published page exists for this node
        return null;
      }
      throw error;
    }

    return data as PublishedPage;
  } catch (error: any) {
    console.error('[PublishService] Error getting publish status:', error);
    return null;
  }
};

// Get a published page by slug (public access - no auth required)
export const getPublishedPage = async (slug: string): Promise<PublishedPageWithNode | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    // First, get the published page (public access via RLS policy)
    const { data, error } = await supabase
      .from('published_pages')
      .select('*')
      .eq('id', slug)
      .eq('is_published', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    // Increment view count (uses security definer function)
    await supabase.rpc('increment_page_view', { page_id: slug });

    return data as PublishedPageWithNode;
  } catch (error: any) {
    console.error('[PublishService] Error getting published page:', error);
    return null;
  }
};

// Get all published pages for current user
export const getMyPublishedPages = async (userId: string): Promise<PublishedPage[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('published_pages')
      .select('*')
      .eq('user_id', userId)
      .order('published_at', { ascending: false });

    if (error) throw error;

    return (data || []) as PublishedPage[];
  } catch (error: any) {
    console.error('[PublishService] Error getting user published pages:', error);
    return [];
  }
};

// Sync published page with latest node content (auto-update)
export const syncPublishedPage = async (
  nodeId: string,
  title: string,
  htmlContent: string
): Promise<PublishResult> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    // Only update if the page exists and is published
    const { data: existing } = await supabase
      .from('published_pages')
      .select('id, is_published')
      .eq('node_id', nodeId)
      .single();

    if (!existing || !existing.is_published) {
      // Not published, nothing to sync
      return { success: true };
    }

    // Update the HTML snapshot
    const { data, error } = await supabase
      .from('published_pages')
      .update({
        title,
        html_snapshot: htmlContent,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;

    console.log('[PublishService] Synced published page:', existing.id);

    return {
      success: true,
      publishedPage: data as PublishedPage,
      publicUrl: getPublicUrl(data.id),
    };
  } catch (error: any) {
    console.error('[PublishService] Error syncing published page:', error);
    return {
      success: false,
      error: error.message || 'Failed to sync published page',
    };
  }
};

// Delete a published page record
export const deletePublishedPage = async (nodeId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('published_pages')
      .delete()
      .eq('node_id', nodeId);

    if (error) throw error;

    return true;
  } catch (error: any) {
    console.error('[PublishService] Error deleting published page:', error);
    return false;
  }
};




