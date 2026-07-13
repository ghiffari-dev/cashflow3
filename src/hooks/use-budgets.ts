import { useCallback, useEffect, useSyncExternalStore } from "react";
import { deleteBudget, listBudgets, setBudget, type BudgetRecord } from "@/lib/db";

let state: BudgetRecord[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function load() {
  state = await listBudgets();
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
function getServer(): BudgetRecord[] {
  return [];
}

export function useBudgets() {
  const budgets = useSyncExternalStore(subscribe, getSnapshot, getServer);

  useEffect(() => {
    if (!loaded) void load();
  }, []);

  const upsert = useCallback(async (rec: BudgetRecord) => {
    await setBudget(rec);
    await load();
  }, []);

  const remove = useCallback(async (category: string) => {
    await deleteBudget(category);
    await load();
  }, []);

  return { budgets, loaded, upsert, remove };
}

/** Best-effort synchronous read of latest budgets (returns cached state). */
export function getBudgetsSnapshot(): BudgetRecord[] {
  return state;
}
