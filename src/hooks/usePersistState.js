import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, db } from "../lib/supabase";

const TABLE_MAP = {
  xnet_pekerjaan: "pekerjaan",
  xnet_leads: "leads",
  xnet_gangguan: "gangguan",
  xnet_tim: "tim",
  xnet_odpodc: "odp_odc",
};

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

export function usePersistState(key, initialValue) {
  const table = TABLE_MAP[key];

  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      console.log(`[PERSIST] ${key}: saved=${saved ? 'found' : 'none'}, initialValue=${initialValue.length} items`);
      return saved ? JSON.parse(saved) : initialValue;
    } catch (err) {
      console.error(`[PERSIST] ${key}: parse error`, err);
      return initialValue;
    }
  });

  // Track IDs we just changed locally — skip realtime events for these
  const suppressedIds = useRef(new Set());
  const suppressTimeout = useRef(null);

  function suppressId(id) {
    suppressedIds.current.add(id);
    clearTimeout(suppressTimeout.current);
    suppressTimeout.current = setTimeout(() => {
      suppressedIds.current.clear();
    }, 1500);
  }

  // On mount: fetch from Supabase and merge
  useEffect(() => {
    if (!table) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await db.fetchAll(table);
        if (cancelled || !rows || !rows.length) return;
        const camelRows = rows.map(toCamel);
        setState(camelRows);
        localStorage.setItem(key, JSON.stringify(camelRows));
      } catch (err) {
        console.warn(`usePersistState fetch ${key}:`, err);
      }
    })();
    return () => { cancelled = true; };
  }, [table, key]);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (err) {
      console.warn(`usePersistState localStorage ${key}:`, err);
    }
  }, [key, state]);

  // Supabase Realtime subscription (disabled until RLS fixed)
  // useEffect(() => {
  //   if (!table) return;
  //   const channel = supabase
  //     .channel(`realtime:${table}`)
  //     .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {})
  //     .subscribe();
  //   return () => { supabase.removeChannel(channel); };
  // }, [table, key]);

  // Sync to Supabase on change (debounced, fire-and-forget)
  const syncTimer = useRef(null);
  const syncToSupabase = useCallback((newState) => {
    if (!table) return;
    if (!Array.isArray(newState)) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        const snakeRows = newState.map((r) => {
          const s = toSnake(r);
          return { ...s, id: r.id };
        });
        await db.upsert(table, snakeRows);
      } catch (err) {
        console.warn(`usePersistState sync ${key}:`, err);
      }
    }, 500);
  }, [table, key]);

  const setPersistState = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      syncToSupabase(next);
      return next;
    });
  }, [syncToSupabase]);

  return [state, setPersistState];
}
