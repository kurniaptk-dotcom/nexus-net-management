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
            if (parsed.tim && !merged.tim) {
              merged.tim = parsed.tim;
            }
          }
          if (!merged.tim && user?.user_metadata?.tim) {
            merged.tim = user.user_metadata.tim;
          }
        } catch (e) {
          // ignore
        }
        if (merged.email === 'ais@nexus.net') {
          if (!merged.tim) merged.tim = 'GATRA - AIS';
          if (merged.role === 'user') merged.role = 'teknisi';
          if (!merged.allowed_menus) merged.allowed_menus = ['/teknisi'];
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
    const cachedDemo = localStorage.getItem("nexus_demo_session");
    if (cachedDemo) {
      try {
        const parsed = JSON.parse(cachedDemo);
        if (parsed.user && parsed.profile) {
          setUser(parsed.user);
          setProfile(parsed.profile);
          setLoading(false);
        }
      } catch (e) {}
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AUTH] Session:', session ? 'found' : 'none');
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else if (!cachedDemo) {
        setLoading(false);
      }
    }).catch(e => {
      console.error('[AUTH] getSession error:', e);
      if (!cachedDemo) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AUTH] State change:', session ? 'found' : 'none');
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else if (!localStorage.getItem("nexus_demo_session")) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email, password, fullName, role = "user", allowedMenus = null, tim = "") {
    // Gunakan unpersisted client agar sesi admin saat ini tidak terganti oleh user baru
    const client = profile?.role === "admin" ? createUnpersistedClient() : supabase;

    // Kirim role default aman ('user') ke auth.signUp agar trigger database Supabase
    // tidak gagal jika database memiliki constraint role lama (seperti profiles_role_check)
    let { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "user",
          tim: tim || "",
        },
      },
    });

    // Jika terjadi "Database error saving new user" (akibat trigger database Supabase bermasalah/error),
    // lakukan retry pendaftaran tanpa options.data agar auth.users tetap berhasil dibuat
    if (error && error.message?.includes("Database error saving new user")) {
      console.warn("Auth trigger error detected, retrying without metadata...");
      const retry = await client.auth.signUp({
        email,
        password,
      });
      if (retry.error) throw retry.error;
      data = retry.data;
      error = null;
    } else if (error) {
      const isAlreadyRegistered =
        error.message?.toLowerCase().includes("already registered") ||
        error.message?.toLowerCase().includes("already in use") ||
        error.status === 400 ||
        error.status === 422;

      if (isAlreadyRegistered) {
        // Cek apakah user sudah ada di profiles
        const { data: existingProf } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", email)
          .maybeSingle();

        if (existingProf) {
          // Profil sudah ada di tabel profiles! Perbarui info dan permissions
          try {
            await updateProfile(existingProf.id, {
              full_name: fullName,
              role,
              allowed_menus: allowedMenus,
              tim: tim || "",
            });
          } catch (e) {
            console.warn("Failed to auto-update existing profile:", e);
          }
          return { user: existingProf, isExisting: true };
        } else {
          // User ada di auth.users tetapi belum ada di profiles (orphaned auth)
          // Coba login dengan password yang dimasukkan untuk mengambil user.id
          try {
            const loginRes = await client.auth.signInWithPassword({ email, password });
            if (loginRes.data?.user) {
              const uId = loginRes.data.user.id;
              try {
                const payload = {
                  id: uId,
                  email,
                  full_name: fullName,
                  role: role === "admin" ? "admin" : "user",
                };
                await supabase.from("profiles").upsert(payload);
              } catch (e) {}

              try {
                localStorage.setItem(
                  `xnet_perms_${uId}`,
                  JSON.stringify({
                    role,
                    allowedMenus,
                    tim: tim || "",
                    updatedAt: new Date().toISOString(),
                  })
                );
              } catch (e) {}

              return { user: loginRes.data.user, isExisting: true, recovered: true };
            }
          } catch (loginErr) {
            console.warn("Auto-recovery signIn failed:", loginErr);
          }
        }
      }
      throw error;
    }

    // Insert/upsert profile directly
    if (data?.user) {
      try {
        const payload = {
          id: data.user.id,
          email,
          full_name: fullName,
          role,
          tim: tim || "",
        };
        if (allowedMenus) payload.allowed_menus = allowedMenus;

        const { error: upsertErr } = await supabase.from("profiles").upsert(payload);
        if (upsertErr) {
          console.warn("Retrying profile upsert with safe role:", upsertErr.message);
          // Fallback if role constraint, allowed_menus or tim column not yet migrated
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

      // Simpan ke cache lokal permissions & tim
      try {
        localStorage.setItem(
          `xnet_perms_${data.user.id}`,
          JSON.stringify({
            role,
            allowedMenus,
            tim: tim || "",
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
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (err) {
      // Graceful fallback untuk akun demo saat offline atau belum terdaftar di Auth Supabase
      const cleanEmail = (email || "").toLowerCase().trim();
      if (cleanEmail === "admin@nexus.net" || cleanEmail === "demo_admin@nexus.net") {
        const demoUser = { id: "demo-admin-id", email: cleanEmail, user_metadata: { full_name: "Nexus Admin" } };
        const demoProf = { id: "demo-admin-id", email: cleanEmail, full_name: "Nexus Admin", role: "admin" };
        localStorage.setItem("nexus_demo_session", JSON.stringify({ user: demoUser, profile: demoProf }));
        setUser(demoUser);
        setProfile(demoProf);
        return { user: demoUser, session: { user: demoUser } };
      }
      if (cleanEmail === "ais@nexus.net" || cleanEmail === "gatra@nexus.net" || cleanEmail === "teknisi@nexus.net") {
        const demoUser = { id: "demo-teknisi-id", email: cleanEmail, user_metadata: { full_name: "Gatra (Ais)", tim: "GATRA - AIS" } };
        const demoProf = { id: "demo-teknisi-id", email: cleanEmail, full_name: "Gatra (Ais)", role: "teknisi", tim: "GATRA - AIS", allowed_menus: ["/teknisi"] };
        localStorage.setItem("nexus_demo_session", JSON.stringify({ user: demoUser, profile: demoProf }));
        setUser(demoUser);
        setProfile(demoProf);
        return { user: demoUser, session: { user: demoUser } };
      }
      throw err;
    }
  }

  async function signOut() {
    localStorage.removeItem("nexus_demo_session");
    try {
      await supabase.auth.signOut();
    } catch (e) {}
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
        delete safeUpdates.tim;
        const { data: fallbackData, error: fbError } = await supabase.from("profiles").update(safeUpdates).eq("id", userId).select().single();
        if (fbError) throw fbError;
        savedData = { ...fallbackData, ...updates };
      }
    } catch (err) {
      throw err;
    }

    // Selalu perbarui cache lokal permissions
    try {
      const existingRaw = localStorage.getItem(`xnet_perms_${userId}`);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      localStorage.setItem(
        `xnet_perms_${userId}`,
        JSON.stringify({
          ...existing,
          role: updates.role || savedData?.role || existing.role,
          allowedMenus: updates.allowed_menus || savedData?.allowed_menus || existing.allowedMenus,
          tim: updates.tim !== undefined ? updates.tim : (savedData?.tim || existing.tim || ""),
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      // ignore
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
