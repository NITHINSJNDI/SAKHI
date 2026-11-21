/**
 * Offline outbox (port of frontend/lib/outbox.ts). A log saved with no signal
 * is kept on the phone and sent when the connection comes back, in order.
 * A later whole-document PUT replaces an earlier queued PUT to the same place.
 */
import { apiFetch, ApiError } from "./api";
import { getJSON, setJSON } from "./storage";

const KEY = "sakhi_outbox";

interface Item {
  url: string;
  method: "POST" | "PUT";
  body: string;
  at: number;
}

type Listener = (count: number) => void;
const listeners = new Set<Listener>();
export function onOutboxChange(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const load = () => getJSON<Item[]>(KEY, []);
const store = async (items: Item[]) => {
  await setJSON(KEY, items.slice(-200));
  listeners.forEach((l) => l(items.length));
};

export async function pendingCount() {
  return (await load()).length;
}

async function enqueue(item: Item) {
  const all = await load();
  const items = item.method === "PUT" ? all.filter((i) => !(i.method === "PUT" && i.url === item.url)) : all;
  await store([...items, item]);
}

export interface SendResult<T = unknown> {
  ok: boolean;
  queued: boolean;
  data?: T;
}

/** Send now, or keep it for later if the network is down (or the server's storage was busy). */
export async function sendOrQueue<T = unknown>(url: string, method: "POST" | "PUT", body: unknown): Promise<SendResult<T>> {
  const text = JSON.stringify(body);
  try {
    const data = await apiFetch<T>(url, { method, body: text });
    return { ok: true, queued: false, data };
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 0;
    // 0 = no connection; 503 = storage busy. Anything else will never succeed.
    if (status !== 0 && status !== 503) return { ok: false, queued: false };
  }
  await enqueue({ url, method, body: text, at: Date.now() });
  return { ok: true, queued: true };
}

let flushing = false;

/** Send everything waiting. Stops at the first network failure and tries again later. */
export async function flushOutbox(): Promise<number> {
  if (flushing) return pendingCount();
  flushing = true;
  try {
    let items = await load();
    while (items.length) {
      const [first] = items;
      try {
        await apiFetch(first.url, { method: first.method, body: first.body });
      } catch (e) {
        const status = e instanceof ApiError ? e.status : 0;
        if (status === 0 || status === 401 || status === 503) break; // try again later
      }
      items = (await load()).filter((i) => !(i.at === first.at && i.url === first.url));
      await store(items);
    }
    return items.length;
  } finally {
    flushing = false;
  }
}
