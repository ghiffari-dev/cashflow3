import { toast } from "sonner";
import type { Transaction } from "./mock-data";
import { getBudgetsSnapshot } from "@/hooks/use-budgets";
import { getTransactionsSnapshot } from "@/hooks/use-transactions";
import { idr } from "./format";

function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

/**
 * Called AFTER a new expense transaction is persisted.
 * Compares spending for the current month against the category budget
 * and fires a toast when the user crosses 80% and 100%.
 */
export function checkBudgetAfterAdd(tx: Transaction) {
  if (tx.type !== "expense") return;
  const budgets = getBudgetsSnapshot();
  const budget = budgets.find((b) => b.category === tx.category);
  if (!budget || budget.limit <= 0) return;

  const month = monthKey(tx.date);
  const spent = getTransactionsSnapshot()
    .filter((t) => t.type === "expense" && t.category === tx.category && monthKey(t.date) === month)
    .reduce((s, t) => s + t.amount, 0);

  const pct = spent / budget.limit;
  const before = (spent - tx.amount) / budget.limit;

  if (pct >= 1 && before < 1) {
    toast.error(`Anggaran ${tx.category} terlampaui`, {
      description: `Terpakai ${idr(spent)} dari batas ${idr(budget.limit)}`,
      duration: 6000,
    });
    // best-effort native notification
    tryNativeNotify(
      `Anggaran ${tx.category} terlampaui`,
      `Terpakai ${idr(spent)} dari ${idr(budget.limit)}`,
    );
  } else if (pct >= 0.8 && before < 0.8) {
    toast.warning(`Anggaran ${tx.category} hampir habis`, {
      description: `${Math.round(pct * 100)}% terpakai (${idr(spent)} / ${idr(budget.limit)})`,
      duration: 5000,
    });
  }
}

function tryNativeNotify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/icon-192.png" });
    } catch {
      /* ignore */
    }
  }
}
