import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { Transaction } from "@/lib/mock-data";
import {
  addTransaction as dbAdd,
  bulkPutTransactions,
  clearTransactions as dbClear,
  deleteTransaction as dbDel,
  listTransactions,
  updateTransaction as dbUpdate,
} from "@/lib/db";

// Simple external store shared across the app
let state: Transaction[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function load() {
  state = await listTransactions();
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

function getServerSnapshot(): Transaction[] {
  return [];
}

export function useTransactions() {
  const txs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!loaded) void load();
  }, []);

  const add = useCallback(async (tx: Transaction) => {
    await dbAdd(tx);
    await load();
  }, []);

  const update = useCallback(async (tx: Transaction) => {
    await dbUpdate(tx);
    await load();
  }, []);

  const remove = useCallback(async (id: string) => {
    await dbDel(id);
    await load();
  }, []);

  const seed = useCallback(async (items: Transaction[]) => {
    await bulkPutTransactions(items);
    await load();
  }, []);

  const replace = useCallback(async (items: Transaction[]) => {
    await dbClear();
    await bulkPutTransactions(items);
    await load();
  }, []);

  const clear = useCallback(async () => {
    await dbClear();
    await load();
  }, []);

  return { transactions: txs, loaded, add, update, remove, seed, replace, clear };
}

/** Best-effort synchronous read (used by non-hook helpers like budget checker). */
export function getTransactionsSnapshot(): Transaction[] {
  return state;
}

/** Force a reload of the transactions store (used after batch changes). */
export async function reloadTransactions() {
  await load();
}
