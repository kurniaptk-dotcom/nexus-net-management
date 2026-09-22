import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../lib/supabase";

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
  delete out.pemasangan;
  delete out.perbaikan;
  delete out.pemutusan;
  return out;
}

export function usePersistState(key, initialValue) {
  const table = TABLE_MAP[key];

  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const prevStateRef = useRef(state);
  useEffect(() => {
    prevStateRef.current = state;
  }, [state]);

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

  // Smart Sync to Supabase: handles insert, update, and delete cleanly without identity constraint error
  const syncTimer = useRef(null);
  const syncToSupabase = useCallback((newState) => {
    if (!table || !Array.isArray(newState)) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        const prevRows = prevStateRef.current || [];
        const nextIds = new Set(newState.map((r) => r.id));

        // 1. Deleted items
        const deletedRows = prevRows.filter((r) => !nextIds.has(r.id) && r.id < 1000000000000);
        for (const d of deletedRows) {
          try {
            await db.remove(table, d.id);
          } catch (e) {
            console.warn(`[SYNC] Remove ${table} id=${d.id} error:`, e.message);
          }
        }

        // 2. Added items (new client items have temporary Date.now() timestamp IDs)
        const addedRows = newState.filter((r) => r.id >= 1000000000000);
        for (const a of addedRows) {
          try {
            const snake = toSnake(a);
            const inserted = await db.insert(table, snake);
            if (inserted && inserted.id) {
              setState((current) => {
                const updated = current.map((row) => (row.id === a.id ? { ...row, id: inserted.id } : row));
                localStorage.setItem(key, JSON.stringify(updated));
                return updated;
              });
            }
          } catch (e) {
            console.warn(`[SYNC] Insert ${table} error:`, e.message);
          }
        }

        // 3. Updated items
        const updatedRows = newState.filter((r) => {
          if (r.id >= 1000000000000) return false;
          const old = prevRows.find((p) => p.id === r.id);
          return old && JSON.stringify(old) !== JSON.stringify(r);
        });
        for (const u of updatedRows) {
          try {
            const snake = toSnake(u);
            await db.update(table, u.id, snake);
          } catch (e) {
            console.warn(`[SYNC] Update ${table} id=${u.id} error:`, e.message);
          }
        }
      } catch (err) {
        console.warn(`usePersistState sync ${key}:`, err);
      }
    }, 400);
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
