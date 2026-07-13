import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_CATEGORIES,
  mergeCategories,
  type CategoryDef,
  type CustomCategoryMap,
  type TxKind,
} from "@/lib/categories";
import { getSetting, setSetting } from "@/lib/db";

const KEY = "custom-categories";

let state: CustomCategoryMap = { income: [], expense: [] };
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function load() {
  const saved = await getSetting<CustomCategoryMap>(KEY);
  state = saved ?? { income: [], expense: [] };
  loaded = true;
  emit();
}

async function persist(next: CustomCategoryMap) {
  state = next;
  await setSetting(KEY, next);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}
function getServer(): CustomCategoryMap {
  return { income: [], expense: [] };
}

export function useCategories() {
  const custom = useSyncExternalStore(subscribe, getSnapshot, getServer);

  useEffect(() => {
    if (!loaded) void load();
  }, []);

  const all = mergeCategories(custom);

  const add = useCallback(async (type: TxKind, def: CategoryDef) => {
    const name = def.name.trim();
    if (!name) throw new Error("Nama kategori kosong");
    // Prevent duplicate against defaults + existing custom
    const combined = mergeCategories(state);
    if (combined[type].some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("Kategori sudah ada");
    }
    const next: CustomCategoryMap = {
      ...state,
      [type]: [...state[type], { name, icon: def.icon || "🧩" }],
    };
    await persist(next);
  }, []);

  const remove = useCallback(async (type: TxKind, name: string) => {
    const next: CustomCategoryMap = {
      ...state,
      [type]: state[type].filter((c) => c.name !== name),
    };
    await persist(next);
  }, []);

  return {
    all,
    custom,
    defaults: DEFAULT_CATEGORIES,
    loaded,
    add,
    remove,
  };
}
