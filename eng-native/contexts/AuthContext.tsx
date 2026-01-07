import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ProfileData } from '../types/profile';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: ProfileData | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_COACH_ID = 'c5e342a9-28a3-4fdb-9947-fe9e76c46b65';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from Supabase with timeout
  const fetchProfile = async (userId: string): Promise<ProfileData | null> => {
    try {
      console.log('Fetching profile for user:', userId);

      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && status !== 406) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (data) {
        console.log('Profile found:', data.first_name, data.last_name);
        // Update coach_id if null
        if (data.coach_id === null) {
          await supabase
            .from('profiles')
            .update({ coach_id: DEFAULT_COACH_ID })
            .eq('id', data.id);
          data.coach_id = DEFAULT_COACH_ID;
        }
        return data as ProfileData;
      }

      // No profile found - try to find by email (for invited users)
      const userEmail = (await supabase.auth.getUser()).data.user?.email;
      if (userEmail) {
        const { data: emailProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', userEmail)
          .is('user_id', null)
          .single();

        if (emailProfile) {
          // Link the profile to this user
          await supabase
            .from('profiles')
            .update({ user_id: userId })
            .eq('id', emailProfile.id);

          // Fetch updated profile
          const { data: updatedProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', emailProfile.id)
            .single();

          if (updatedProfile) {
            if (updatedProfile.coach_id === null) {
              await supabase
                .from('profiles')
                .update({ coach_id: DEFAULT_COACH_ID })
                .eq('id', updatedProfile.id);
              updatedProfile.coach_id = DEFAULT_COACH_ID;
            }
            return updatedProfile as ProfileData;
          }
        }

        // Create new profile (use upsert to handle race conditions)
        const newProfileData = {
          user_id: userId,
          email: userEmail,
          role: 'athlete',
          onboarding_complete: false,
          coach_id: DEFAULT_COACH_ID,
        };

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .upsert(newProfileData, { onConflict: 'user_id' })
          .select()
          .single();

        // If upsert failed due to conflict, try fetching again
        if (insertError) {
          console.log('Profile upsert conflict, fetching existing profile');
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (existingProfile) {
            return existingProfile as ProfileData;
          }
        }

        if (newProfile) {
          return newProfile as ProfileData;
        }
      }

      return null;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, skipping auth check');
      setLoading(false);
      return;
    }

    let isMounted = true;
    let didComplete = false;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log('Auth state changed:', event, currentSession ? 'has session' : 'no session');
            if (!isMounted) return;

            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            // Only fetch profile on SIGNED_IN event, not on TOKEN_REFRESHED
            // TOKEN_REFRESHED happens frequently and we already have the profile
            if (event === 'SIGNED_IN' && currentSession?.user) {
              try {
                const profileData = await fetchProfile(currentSession.user.id);
                if (isMounted) {
                  setProfile(profileData);
                }
              } catch (error) {
                console.error('Error fetching profile on sign in:', error);
              }
            } else if (event === 'SIGNED_OUT') {
              setProfile(null);
            }
            // For TOKEN_REFRESHED, we keep the existing profile - no need to refetch
          }
        );
        authSubscription = subscription;

        console.log('Getting initial session...');
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error.message);
        } else {
          console.log('Initial session:', data?.session ? 'found' : 'none');
        }

        if (isMounted) {
          setSession(data?.session ?? null);
          setUser(data?.session?.user ?? null);

          // Fetch profile for initial session
          if (data?.session?.user) {
            const profileData = await fetchProfile(data.session.user.id);
            if (isMounted) {
              setProfile(profileData);
            }
          }

          setLoading(false);
          didComplete = true;
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setLoading(false);
          didComplete = true;
        }
      }
    };

    const timeout = setTimeout(() => {
      if (isMounted && !didComplete) {
        console.log('Auth check timed out after 5s - proceeding without session');
        setLoading(false);
      }
    }, 5000);

    initializeAuth();

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Supabase is not configured' } as AuthError };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Supabase is not configured' } as AuthError };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (!error && data.user && data.user.identities && data.user.identities.length === 0) {
        return { error: { message: 'An account with this email already exists' } as AuthError };
      }

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Supabase is not configured' } as AuthError };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isConfigured: isSupabaseConfigured,
        signInWithPassword,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
