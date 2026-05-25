import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, area: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithMicrosoft: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signInWithMicrosoft: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    console.log('Initializing auth system...');

    // Set up auth state listener FIRST (critical for session persistence)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        if (!mounted) return;

        // Always update session and user state
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle auth events with deferred async operations to prevent deadlocks
        if (event === 'SIGNED_IN' && session?.user) {
          
          // Defer database operations to prevent callback deadlocks
          setTimeout(async () => {
              try {
                // For all providers, only update session-related fields to avoid overwriting
                // manually edited profile data like full_name, area or email.
                await supabase
                  .from('profiles')
                  .update({
                    last_login: new Date().toISOString(),
                    status: 'En Línea',
                  })
                  .eq('user_id', session.user.id);
              } catch (error) {
                console.error('Error updating profile session info:', error);
              }
            }, 0);
          }
          
          if (event === 'SIGNED_OUT') {
          // Defer database operations to prevent callback deadlocks
          setTimeout(async () => {
            if (session?.user) {
              try {
                await supabase
                  .from('profiles')
                  .update({ status: 'No disponible' })
                  .eq('user_id', session.user.id);
              } catch (error) {
                console.error('Error updating status on signout:', error);
              }
            }
          }, 0);
          
          // Clear URL hash on sign out
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
      }
    );

    // THEN check for existing session (critical order for session persistence)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      }
      
      console.log('Existing session found:', !!session, session?.user?.email);
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [toast]);

  const signUp = async (email: string, password: string, fullName: string, area: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          area: area,
        }
      }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error de registro",
        description: error.message,
      });
    } else {
      toast({
        title: "Registro exitoso",
        description: "Verifica tu email para activar tu cuenta.",
      });
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: error.message,
      });
    }
    
    return { error };
  };

  const signInWithMicrosoft = async () => {
    try {
      // Clear any existing hash from URL before starting OAuth flow
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email profile openid User.Read',
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            prompt: 'login', // Force fresh login for MFA
            access_type: 'offline'
          }
        }
      });

      if (error) {
        console.error('Azure OAuth error:', error);
        toast({
          variant: "destructive",
          title: "Error de autenticación Microsoft",
          description: `No se pudo conectar con Microsoft: ${error.message}`,
        });
        return { error };
      }

      // OAuth flow initiated successfully
      return { error: null };
    } catch (err) {
      console.error('Unexpected error during Microsoft sign in:', err);
      const error = err as Error;
      toast({
        variant: "destructive",
        title: "Error inesperado",
        description: "Ocurrió un error al intentar conectar con Microsoft",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          variant: "destructive",
          title: "Error al cerrar sesión",
          description: error.message,
        });
      } else {
        toast({
          title: "Sesión cerrada",
          description: "Has cerrado sesión correctamente.",
        });
      }
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        variant: "destructive",
        title: "Error al cerrar sesión",
        description: "Ocurrió un error inesperado.",
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signInWithMicrosoft,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};