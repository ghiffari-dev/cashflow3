import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  deleteTemplate as dbDel,
  listTemplates,
  putTemplate,
  type QuickTemplate,
} from "@/lib/db";

let state: QuickTemplate[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
async function load() {
  state = await listTemplates();
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
function getServer(): QuickTemplate[] {
  return [];
}

export function useTemplates() {
  const templates = useSyncExternalStore(subscribe, getSnapshot, getServer);

  useEffect(() => {
    if (!loaded) void load();
  }, []);

  const upsert = useCallback(async (tpl: QuickTemplate) => {
    await putTemplate(tpl);
    await load();
  }, []);

  const remove = useCallback(async (id: string) => {
    await dbDel(id);
    await load();
  }, []);

  return { templates, loaded, upsert, remove };
}
