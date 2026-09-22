import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error) {
        console.error("fetchProfile error:", error.message);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("fetchProfile exception:", err);
      setProfile(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    console.log('[AUTH] Checking session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AUTH] Session:', session ? 'found' : 'none');
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    }).catch(e => console.error('[AUTH] getSession error:', e));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AUTH] State change:', session ? 'found' : 'none');
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email, password, fullName, role = "user") {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) throw error;
    // If admin is creating user, insert profile directly
    if (profile?.role === "admin" && data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
      });
    }
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function deleteUser(userId) {
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) throw error;
  }

  async function deleteUserCompletely(userId) {
    const profileError = await supabase.from("profiles").delete().eq("id", userId);
    if (profileError.error) throw profileError.error;
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      console.warn("Could not delete auth user (need service role):", error.message);
    }
  }

  async function updateProfile(userId, updates) {
    const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single();
    if (error) throw error;
    if (userId === user?.id) setProfile(data);
    return data;
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, deleteUser, deleteUserCompletely, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
