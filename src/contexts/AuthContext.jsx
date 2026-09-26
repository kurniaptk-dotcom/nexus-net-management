import { createContext, useContext, useState, useEffect } from "react";
import { supabase, createUnpersistedClient } from "../lib/supabase";

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
        // Merge with local permissions cache if DB column not yet migrated
        let merged = { ...data };
        try {
          const cached = localStorage.getItem(`xnet_perms_${userId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.allowedMenus && !merged.allowed_menus) {
              merged.allowed_menus = parsed.allowedMenus;
            }
            if (parsed.role && merged.role === "user" && parsed.role !== "user") {
              merged.role = parsed.role;
            }
          }
        } catch (e) {
          // ignore
        }
        setProfile(merged);
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

  async function signUp(email, password, fullName, role = "user", allowedMenus = null) {
    // Gunakan unpersisted client agar sesi admin saat ini tidak terganti oleh user baru
    const client = profile?.role === "admin" ? createUnpersistedClient() : supabase;
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role, allowed_menus: allowedMenus } },
    });
    if (error) throw error;

    // Insert/upsert profile directly
    if (data.user) {
      try {
        const payload = {
          id: data.user.id,
          email,
          full_name: fullName,
          role,
        };
        if (allowedMenus) payload.allowed_menus = allowedMenus;

        const { error: upsertErr } = await supabase.from("profiles").upsert(payload);
        if (upsertErr) {
          console.warn("Retrying profile upsert with safe role:", upsertErr.message);
          // Fallback if role constraint or allowed_menus column not yet migrated
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email,
            full_name: fullName,
            role: role === "admin" ? "admin" : "user",
          });
        }
      } catch (err) {
        console.warn("Profile upsert exception:", err);
      }

      // Simpan ke cache lokal permissions
      try {
        localStorage.setItem(
          `xnet_perms_${data.user.id}`,
          JSON.stringify({
            role,
            allowedMenus,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (e) {
        // ignore
      }
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
    let savedData = null;
    try {
      const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single();
      if (!error) {
        savedData = data;
      } else {
        console.warn("Direct updateProfile failed, using safe fallback:", error.message);
        const safeUpdates = { ...updates };
        if (safeUpdates.role && safeUpdates.role !== "admin" && safeUpdates.role !== "user") {
          safeUpdates.role = "user";
        }
        delete safeUpdates.allowed_menus;
        const { data: fallbackData, error: fbError } = await supabase.from("profiles").update(safeUpdates).eq("id", userId).select().single();
        if (fbError) throw fbError;
        savedData = { ...fallbackData, ...updates };
      }
    } catch (err) {
      throw err;
    }

    // Selalu perbarui cache lokal permissions
    if (updates.allowed_menus || updates.role) {
      try {
        localStorage.setItem(
          `xnet_perms_${userId}`,
          JSON.stringify({
            role: updates.role || savedData?.role,
            allowedMenus: updates.allowed_menus || savedData?.allowed_menus,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (e) {
        // ignore
      }
    }

    if (userId === user?.id) {
      setProfile((prev) => ({ ...prev, ...savedData }));
    }
    return savedData;
  }

  async function resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw error;
    return data;
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, deleteUser, deleteUserCompletely, updateProfile, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
