import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  deleteRecurring as dbDel,
  listRecurring,
  putRecurring,
  type RecurringRule,
} from "@/lib/db";

let state: RecurringRule[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
async function load() {
  state = await listRecurring();
  loaded = true;
  emit();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return state;
}
function getServer(): RecurringRule[] {
  return [];
}

export function useRecurring() {
  const rules = useSyncExternalStore(subscribe, getSnapshot, getServer);

  useEffect(() => {
    if (!loaded) void load();
  }, []);

  const upsert = useCallback(async (rule: RecurringRule) => {
    await putRecurring(rule);
    await load();
  }, []);

  const remove = useCallback(async (id: string) => {
    await dbDel(id);
    await load();
  }, []);

  const toggle = useCallback(async (id: string, active: boolean) => {
    const cur = state.find((r) => r.id === id);
    if (!cur) return;
    await putRecurring({ ...cur, active });
    await load();
  }, []);

  return { rules, loaded, upsert, remove, toggle, reload: load };
}

export function getRecurringSnapshot(): RecurringRule[] {
  return state;
}

export async function reloadRecurring() {
  await load();
}
