import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Transaction } from "./mock-data";

export type BudgetRecord = { category: string; limit: number };

interface KeuanganDB extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: { "by-date": string; "by-type": string };
  };
  settings: {
    key: string;
    value: unknown;
  };
  budgets: {
    key: string;
    value: BudgetRecord;
  };
}

const DB_NAME = "keuangan-db";
const DB_VERSION = 2;

let dbp: Promise<IDBPDatabase<KeuanganDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<KeuanganDB>> {
  if (!dbp) {
    dbp = openDB<KeuanganDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains("transactions")) {
          const store = db.createObjectStore("transactions", { keyPath: "id" });
          store.createIndex("by-date", "date");
          store.createIndex("by-type", "type");
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains("budgets")) {
          db.createObjectStore("budgets", { keyPath: "category" });
        }
      },
    });
  }
  return dbp;
}

// --- Transactions ---
export async function listTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("transactions", "by-date");
  return all.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function addTransaction(tx: Transaction) {
  const db = await getDB();
  await db.put("transactions", tx);
}

export async function updateTransaction(tx: Transaction) {
  const db = await getDB();
  await db.put("transactions", tx);
}

export async function deleteTransaction(id: string) {
  const db = await getDB();
  await db.delete("transactions", id);
}

export async function bulkPutTransactions(items: Transaction[]) {
  const db = await getDB();
  const tx = db.transaction("transactions", "readwrite");
  await Promise.all(items.map((it) => tx.store.put(it)));
  await tx.done;
}

export async function clearTransactions() {
  const db = await getDB();
  await db.clear("transactions");
}

// --- Settings ---
export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return (await db.get("settings", key)) as T | undefined;
}

export async function setSetting(key: string, value: unknown) {
  const db = await getDB();
  await db.put("settings", value, key);
}

export async function delSetting(key: string) {
  const db = await getDB();
  await db.delete("settings", key);
}

// --- Budgets ---
export async function listBudgets(): Promise<BudgetRecord[]> {
  const db = await getDB();
  return db.getAll("budgets");
}

export async function setBudget(rec: BudgetRecord) {
  const db = await getDB();
  await db.put("budgets", rec);
}

export async function deleteBudget(category: string) {
  const db = await getDB();
  await db.delete("budgets", category);
}
