import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch } from "./api";
import { sendOrQueue } from "./outbox";
import { getJSON, setJSON } from "./storage";

/** Kinds the backend's /api/user-doc/<kind> accepts. */
export type UserDocKind =
  | "tablets"
  | "checklists"
  | "family"
  | "mood_checks"
  | "postpartum"
  | "her_goal"
  | "meals"
  | "hygiene";

const cacheKey = (kind: string) => `sakhi_doc_${kind}`;
// Every mounted copy of a doc, so a save in one (say the pad dialog) shows in the others (the care card)
const mounted = new Map<string, Set<(v: object) => void>>();

/**
 * Port of frontend/hooks/useUserDoc: load and save one per-user document.
 * Saves are optimistic. Offline, the last copy is shown and saves wait in the
 * outbox. With no copy at all, saves stay on screen only, so an empty form can
 * never overwrite her real data.
 */
export function useUserDoc<T extends object>(kind: UserDocKind, fallback: T) {
  const [doc, setDoc] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef<T>(fallback);
  const fallbackRef = useRef(fallback);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const ready = useRef<Promise<void>>(Promise.resolve());
  const known = useRef(false);

  const onPeerSave = useRef((v: object) => {
    latest.current = v as T;
    setDoc(v as T);
  }).current;
  useEffect(() => {
    const set = mounted.get(kind) ?? new Set();
    mounted.set(kind, set);
    set.add(onPeerSave);
    return () => void set.delete(onPeerSave);
  }, [kind, onPeerSave]);

  useEffect(() => {
    let alive = true;
    ready.current = apiFetch<{ doc: T | null }>(`/api/user-doc/${kind}`)
      .then(async (j) => {
        if (!alive) return;
        const value = j?.doc && typeof j.doc === "object" ? ({ ...fallbackRef.current, ...j.doc } as T) : fallbackRef.current;
        known.current = true;
        await setJSON(cacheKey(kind), value);
        latest.current = value;
        setDoc(value);
      })
      .catch(async () => {
        if (!alive) return;
        const cached = await getJSON<T | null>(cacheKey(kind), null);
        if (cached && typeof cached === "object") {
          known.current = true;
          latest.current = { ...fallbackRef.current, ...cached } as T;
          setDoc(latest.current);
        }
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [kind, version]);

  const save = useCallback(
    async (next: T | ((prev: T) => T)) => {
      await ready.current;
      const value = typeof next === "function" ? (next as (p: T) => T)(latest.current) : next;
      latest.current = value;
      setDoc(value);
      mounted.get(kind)?.forEach((fn) => fn !== onPeerSave && fn(value));
      if (!known.current) return false;
      await setJSON(cacheKey(kind), value);
      return (await sendOrQueue(`/api/user-doc/${kind}`, "PUT", { doc: value })).ok;
    },
    [kind, onPeerSave],
  );

  return { doc, save, loaded, reload };
}

/** Local calendar day as YYYY-MM-DD (same as the web's dayKey). */
export const dayKey = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return z.toISOString().slice(0, 10);
};
