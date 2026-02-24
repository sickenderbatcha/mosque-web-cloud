import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;
    let resolved = false;
    let timeoutId: number | undefined;

    const finish = () => {
      if (!isSubscribed || resolved) return;
      resolved = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      setLoading(false);
    };

    // Timeout fallback to prevent indefinite loading (5 seconds for production)
    timeoutId = window.setTimeout(() => {
      if (!isSubscribed || resolved) return;
      console.warn("Auth timeout: forcing loading to complete after 5s");
      finish();
    }, 5000);

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;
      setSession(session);
      setUser(session?.user ?? null);
      finish();
    });

    // THEN check for existing session with error handling
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!isSubscribed) return;

        if (error) {
          console.log("Session error (clearing stale session):", error.message);
          setSession(null);
          setUser(null);

          const msg = (error.message || "").toLowerCase();
          const isRefreshTokenIssue = msg.includes("refresh_token") || msg.includes("invalid refresh") || msg.includes("jwt expired");
          if (isRefreshTokenIssue) {
            toast.error("Session expired", {
              description: "Please log in again to continue.",
            });
          }
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }

        finish();
      })
      .catch((err) => {
        if (!isSubscribed) return;
        console.log("Failed to get session:", err);
        setSession(null);
        setUser(null);
        finish();
      });

    return () => {
      isSubscribed = false;
      if (timeoutId) window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Clear local state first to ensure UI updates even if API call fails
    setSession(null);
    setUser(null);
    
    // Then attempt to sign out from Supabase (may fail if session already expired)
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Session might already be invalid, but we've cleared local state
      console.log("Sign out completed (session may have already expired)");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
