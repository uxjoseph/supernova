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

  // Initialize auth state
  useEffect(() => {
    if (!isConfigured) {
      console.log('[Auth] Supabase not configured, skipping auth');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // Get initial session - 단순하게!
    const initSession = async () => {
      try {
        console.log('[Auth] Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('[Auth] Error getting session:', error);
          setIsLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('[Auth] User found:', session.user.email);
          try {
            const profile = await fetchProfile(session.user.id);
            if (isMounted) setProfile(profile);
          } catch (e) {
            console.error('[Auth] Profile fetch error:', e);
          }
        } else {
          console.log('[Auth] No user session');
        }
        
        if (isMounted) {
          console.log('[Auth] Session init complete');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[Auth] Session init error:', error);
        if (isMounted) setIsLoading(false);
      }
    };
    
    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session) => {
        console.log('[Auth] Auth state changed:', event);
        
        if (!isMounted) return;
        
        // SIGNED_OUT 이벤트는 즉시 처리
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          console.log('[Auth] Signed out');
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch or create profile
          try {
            const userProfile = await fetchProfile(session.user.id);
            if (isMounted) setProfile(userProfile);

            // If profile doesn't exist yet, create it
            if (!userProfile && event === 'SIGNED_IN') {
              const { data: newProfile, error } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
                  avatar_url: session.user.user_metadata?.avatar_url,
                  plan_type: 'free',
                  credits_remaining: 100,
                  credits_max: 300,
                })
                .select()
                .single();

              if (newProfile && isMounted) {
                setProfile(newProfile as Profile);
              }
              if (error) {
                console.error('[Auth] Error creating profile:', error);
              }
            }
          } catch (err) {
            console.error('[Auth] Profile error:', err);
          }
        } else {
          if (isMounted) setProfile(null);
        }

        if (isMounted) setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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

