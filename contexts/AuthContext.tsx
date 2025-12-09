import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile } from '../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string) => {
    if (!isConfigured) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Profile doesn't exist yet, it will be created by database trigger
        console.log('Profile not found, will be created on first login');
        return null;
      }

      return data as Profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, [isConfigured]);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (user) {
      const newProfile = await fetchProfile(user.id);
      setProfile(newProfile);
    }
  }, [user, fetchProfile]);

  // Initialize auth state - 최대한 단순하게
  useEffect(() => {
    if (!isConfigured) {
      console.log('[Auth] Supabase not configured');
      setIsLoading(false);
      return;
    }

    // 즉시 로딩 완료 - UI가 멈추지 않도록
    setIsLoading(false);

    // Get session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Session loaded:', session?.user?.email || 'none');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then(p => {
          console.log('[Auth] Profile loaded:', p?.email || 'none');
          setProfile(p);
        }).catch(console.error);
      }
    }).catch(err => {
      console.error('[Auth] getSession error:', err);
    });

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session) => {
        console.log('[Auth] State changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          return;
        }

        if (session?.user) {
          fetchProfile(session.user.id).then(p => {
            setProfile(p);
            
            // Profile 없으면 생성
            if (!p && event === 'SIGNED_IN') {
              supabase.from('profiles').insert({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
                avatar_url: session.user.user_metadata?.avatar_url,
                plan_type: 'free',
                credits_remaining: 100,
                credits_max: 300,
              }).select().single().then(({ data }) => {
                if (data) setProfile(data as Profile);
              });
            }
          }).catch(console.error);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [isConfigured, fetchProfile]);

  // Sign in with Google
  const signInWithGoogle = async () => {
    if (!isConfigured) {
      console.error('Supabase is not configured. Please set up environment variables.');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    if (!isConfigured) return;

    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }

    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isConfigured,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

