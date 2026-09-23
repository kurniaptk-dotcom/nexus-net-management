import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://iyxekxcklmvfasbvcgyl.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eGVreGNrbG12ZmFzYnZjZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNjE1MDYsImV4cCI6MjEwNTYzNzUwNn0.yWRSbNfArKGKULZztkUSRSjQv5Cf7oEcL_4QIZO4h0o";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Unpersisted client for admin actions (e.g. creating users without overriding current admin session)
export function createUnpersistedClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Generic CRUD helpers
export const db = {
  // Fetch all rows from a table
  async fetchAll(table) {
    const { data, error } = await supabase.from(table).select("*").order("id", { ascending: true });
    if (error) throw error;
    return data;
  },

  // Insert one row
  async insert(table, row) {
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) throw error;
    return data;
  },

  // Update row by id
  async update(table, id, updates) {
    const { data, error } = await supabase.from(table).update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  // Delete row by id
  async remove(table, id) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
  },

  // Upsert many rows (for sync)
  async upsert(table, rows, onConflict = "id") {
    const { data, error } = await supabase.from(table).upsert(rows, { onConflict }).select();
    if (error) throw error;
    return data;
  },
};
