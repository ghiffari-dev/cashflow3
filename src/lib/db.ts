import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Transaction, TxType } from "./mock-data";

export type BudgetRecord = { category: string; limit: number };

export type Frequency = "daily" | "weekly" | "monthly";

export type RecurringRule = {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  icon: string;
  note: string;
  frequency: Frequency;
  /** For weekly: 0..6 (Sun..Sat). For monthly: 1..28. Unused for daily. */
  dayOfPeriod?: number;
  /** ISO date (YYYY-MM-DD) — first day the rule becomes active. */
  startDate: string;
  /** ISO date of the last generated occurrence, or null if never. */
  lastRun: string | null;
  active: boolean;
};

export type QuickTemplate = {
  id: string;
  label: string;
  type: TxType;
  amount: number;
  category: string;
  icon: string;
  note: string;
};

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
  recurring: {
    key: string;
    value: RecurringRule;
  };
  templates: {
    key: string;
    value: QuickTemplate;
  };
}

const DB_NAME = "keuangan-db";
const DB_VERSION = 3;

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
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains("recurring")) {
            db.createObjectStore("recurring", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("templates")) {
            db.createObjectStore("templates", { keyPath: "id" });
          }
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

// --- Recurring ---
export async function listRecurring(): Promise<RecurringRule[]> {
  const db = await getDB();
  return db.getAll("recurring");
}
export async function putRecurring(rule: RecurringRule) {
  const db = await getDB();
  await db.put("recurring", rule);
}
export async function deleteRecurring(id: string) {
  const db = await getDB();
  await db.delete("recurring", id);
}

// --- Templates ---
export async function listTemplates(): Promise<QuickTemplate[]> {
  const db = await getDB();
  return db.getAll("templates");
}
export async function putTemplate(tpl: QuickTemplate) {
  const db = await getDB();
  await db.put("templates", tpl);
}
export async function deleteTemplate(id: string) {
  const db = await getDB();
  await db.delete("templates", id);
}
