// Supabase Database Types
// These types match the database schema defined in the plan

export type PlanType = 'free' | 'pro_monthly' | 'pro_annual';

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  plan_type: PlanType;
  credits_remaining: number;
  credits_max: number;
  credits_reset_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanvasNode {
  id: string;
  project_id: string;
  type: 'component' | 'image' | 'note';
  title: string | null;
  html: string | null;
  image_url: string | null;
  content: string | null;
  color: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

export interface CreditUsage {
  id: string;
  user_id: string;
  amount: number;
  action: 'generation' | 'variant' | 'edit';
  project_id: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  role: 'user' | 'model';
  content: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  component_title: string | null;
  is_thinking: boolean;
  generation_sections: any | null; // JSON type for GenerationSection[]
  created_at: string;
}

export interface PublishedPage {
  id: string;           // UUID, also used as public slug
  node_id: string;      // Reference to canvas_nodes
  project_id: string;   // Reference to projects
  user_id: string;      // Reference to profiles
  title: string | null;
  html_snapshot: string | null;  // HTML snapshot for public viewing
  is_published: boolean;
  view_count: number;
  published_at: string;
  created_at: string;
  updated_at: string;
}

// Supabase Database interface for type-safe queries
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'id'>>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Project, 'id'>>;
      };
      canvas_nodes: {
        Row: CanvasNode;
        Insert: Omit<CanvasNode, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<CanvasNode, 'id'>>;
      };
      credit_usage: {
        Row: CreditUsage;
        Insert: Omit<CreditUsage, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<CreditUsage, 'id'>>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Omit<ChatMessage, 'id'>>;
      };
      published_pages: {
        Row: PublishedPage;
        Insert: Omit<PublishedPage, 'id' | 'view_count' | 'created_at' | 'updated_at' | 'published_at'> & {
          id?: string;
          view_count?: number;
          published_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PublishedPage, 'id'>>;
      };
    };
  };
}

// Credit costs for different actions
export const CREDIT_COSTS = {
  generation: 10,  // Landing page generation
  variant: 5,      // Variant creation
  edit: 2,         // Element modification
} as const;

// Plan configurations
export const PLAN_CONFIG = {
  free: {
    name: 'Free',
    creditsPerDay: 100,
    creditsMax: 300,
    canExportCode: false,
    price: 0,
  },
  pro_monthly: {
    name: 'Professional (Monthly)',
    creditsPerMonth: 1500,
    creditsMax: 1500,
    canExportCode: true,
    price: 20,
    priceUnit: 'month',
  },
  pro_annual: {
    name: 'Professional (Annual)',
    creditsPerYear: 18000,
    creditsMax: 1500, // Per month equivalent
    canExportCode: true,
    price: 199,
    priceUnit: 'year',
    savings: 40,
  },
} as const;

