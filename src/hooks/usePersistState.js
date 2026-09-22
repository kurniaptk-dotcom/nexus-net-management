import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../lib/supabase";

// Map localStorage keys to Supabase table names
const TABLE_MAP = {
  xnet_pekerjaan: "pekerjaan",
  xnet_leads: "leads",
  xnet_gangguan: "gangguan",
  xnet_tim: "tim",
  xnet_odpodc: "odp_odc",
};

// snake_case → camelCase
function toCamel(row) {
  if (!row) return row;
  const out = { ...row };
  if (out.user_terdampak !== undefined) { out.userTerdampak = out.user_terdampak; delete out.user_terdampak; }
  if (out.tanggal_mulai !== undefined) { out.tanggalMulai = out.tanggal_mulai; delete out.tanggal_mulai; }
  if (out.follow_up !== undefined) { out.followUp = out.follow_up; delete out.follow_up; }
  if (out.hasil_fu !== undefined) { out.hasilFU = out.hasil_fu; delete out.hasil_fu; }
  delete out.created_at;
  return out;
}

// camelCase → snake_case
function toSnake(row) {
  if (!row) return row;
  const out = { ...row };
  if (out.userTerdampak !== undefined) { out.user_terdampak = out.userTerdampak; delete out.userTerdampak; }
  if (out.tanggalMulai !== undefined) { out.tanggal_mulai = out.tanggalMulai; delete out.tanggalMulai; }
  if (out.followUp !== undefined) { out.follow_up = out.followUp; delete out.followUp; }
  if (out.hasilFU !== undefined) { out.hasil_fu = out.hasilFU; delete out.hasilFU; }
  delete out.id;
  delete out.created_at;
  return out;
}

/**
 * usePersistState — localStorage + Supabase hybrid.
 * - Instant UI from localStorage
 * - Syncs to Supabase in background
 * - On mount, fetches latest from Supabase
 */
export function usePersistState(key, initialValue) {
  const table = TABLE_MAP[key];
  const mountedRef = useRef(false);

  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // On mount: fetch from Supabase and merge
  useEffect(() => {
    if (!table) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await db.fetchAll(table);
        if (cancelled || !rows.length) return;
        const camelRows = rows.map(toCamel);
        setState(camelRows);
        localStorage.setItem(key, JSON.stringify(camelRows));
      } catch {}
      mountedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, [table, key]);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  // Sync to Supabase on change (debounced, fire-and-forget)
  const syncTimer = useRef(null);
  const syncToSupabase = useCallback((newState) => {
    if (!table) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        // Upsert all rows to Supabase
        const snakeRows = newState.map((r) => {
          const s = toSnake(r);
          return { ...s, id: r.id };
        });
        await db.upsert(table, snakeRows);
      } catch {}
    }, 500);
  }, [table]);

  // Wrap setState to also sync to Supabase
  const setPersistState = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      syncToSupabase(next);
      return next;
    });
  }, [syncToSupabase]);

  return [state, setPersistState];
}
