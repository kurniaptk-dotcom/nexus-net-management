import { useState, useEffect, useCallback } from "react";
import { db } from "../lib/supabase";

// Table mapping for each localStorage key
const TABLE_MAP = {
  xnet_pekerjaan: "pekerjaan",
  xnet_leads: "leads",
  xnet_gangguan: "gangguan",
  xnet_tim: "tim",
  xnet_odpodc: "odp_odc",
};

// Convert snake_case columns to camelCase for frontend
function toCamel(row) {
  if (!row) return row;
  const out = { ...row };
  if (out.user_terdampak !== undefined) {
    out.userTerdampak = out.user_terdampak;
    delete out.user_terdampak;
  }
  if (out.tanggal_mulai !== undefined) {
    out.tanggalMulai = out.tanggal_mulai;
    delete out.tanggal_mulai;
  }
  if (out.follow_up !== undefined) {
    out.followUp = out.follow_up;
    delete out.follow_up;
  }
  if (out.hasil_fu !== undefined) {
    out.hasilFU = out.hasil_fu;
    delete out.hasil_fu;
  }
  delete out.created_at;
  return out;
}

// Convert camelCase to snake_case for DB
function toSnake(row) {
  if (!row) return row;
  const out = { ...row };
  if (out.userTerdampak !== undefined) {
    out.user_terdampak = out.userTerdampak;
    delete out.userTerdampak;
  }
  if (out.tanggalMulai !== undefined) {
    out.tanggal_mulai = out.tanggalMulai;
    delete out.tanggalMulai;
  }
  if (out.followUp !== undefined) {
    out.follow_up = out.followUp;
    delete out.followUp;
  }
  if (out.hasilFU !== undefined) {
    out.hasil_fu = out.hasilFU;
    delete out.hasilFU;
  }
  delete out.id;
  delete out.created_at;
  return out;
}

/**
 * Hook like useState but backed by Supabase.
 * Falls back to localStorage seed data if Supabase is unreachable.
 */
export function useSupabaseState(key, seedData) {
  const table = TABLE_MAP[key];
  const [state, setState] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!table) {
          setState(seedData);
          setLoading(false);
          return;
        }
        const rows = await db.fetchAll(table);
        if (!cancelled) {
          setState(rows.map(toCamel));
          setLoading(false);
        }
      } catch {
        // Fallback to seed data if Supabase unreachable
        if (!cancelled) {
          setState(seedData);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [table]);

  // Insert helper
  const addItem = useCallback(async (item) => {
    if (!table) {
      setState((prev) => [...prev, { id: Date.now(), ...item }]);
      return;
    }
    const row = await db.insert(table, toSnake(item));
    setState((prev) => [...prev, toCamel(row)]);
  }, [table]);

  // Update helper
  const updateItem = useCallback(async (id, updates) => {
    if (!table) {
      setState((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
      return;
    }
    const row = await db.update(table, id, toSnake(updates));
    setState((prev) => prev.map((r) => (r.id === id ? toCamel(row) : r)));
  }, [table]);

  // Delete helper
  const removeItem = useCallback(async (id) => {
    if (!table) {
      setState((prev) => prev.filter((r) => r.id !== id));
      return;
    }
    await db.remove(table, id);
    setState((prev) => prev.filter((r) => r.id !== id));
  }, [table]);

  // Replace all (for drag-drop, bulk updates)
  const setAll = useCallback(async (newData) => {
    setState(newData);
  }, []);

  return { data: state, loading, addItem, updateItem, removeItem, setAll };
}
