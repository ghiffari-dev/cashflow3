import { addTransaction, listRecurring, putRecurring, type RecurringRule } from "./db";
import type { Transaction } from "./mock-data";

function toISODate(d: Date): string {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
}

/**
 * Yield the next occurrence date strictly after `after` (YYYY-MM-DD),
 * up to and including `today`, following the rule.
 */
function* occurrences(rule: RecurringRule, after: string, today: string) {
  const start = new Date(`${rule.startDate}T00:00:00`);
  const end = new Date(`${today}T00:00:00`);
  let cursor = new Date(`${after}T00:00:00`);
  // Start from max(after, startDate - 1 day) so we can then advance to first occurrence >= start
  if (cursor < new Date(start.getTime() - 86400000)) {
    cursor = new Date(start.getTime() - 86400000);
  }

  const safety = 400; // cap iterations to avoid runaway loops
  for (let i = 0; i < safety; i++) {
    if (rule.frequency === "daily") {
      cursor.setDate(cursor.getDate() + 1);
    } else if (rule.frequency === "weekly") {
      // advance to next day-of-week
      const target = rule.dayOfPeriod ?? start.getDay();
      cursor.setDate(cursor.getDate() + 1);
      while (cursor.getDay() !== target) {
        cursor.setDate(cursor.getDate() + 1);
        if (cursor > end) break;
      }
    } else {
      // monthly on given day-of-month
      const dom = Math.min(Math.max(rule.dayOfPeriod ?? 1, 1), 28);
      // move to next occurrence
      if (cursor.getDate() < dom) {
        cursor.setDate(dom);
      } else {
        cursor.setMonth(cursor.getMonth() + 1);
        cursor.setDate(dom);
      }
    }
    if (cursor > end) return;
    if (cursor < start) continue;
    yield toISODate(cursor);
  }
}

/**
 * Process all active recurring rules — create missing transactions from the
 * last run (or startDate) up to today. Safe to call on every app load.
 */
export async function runRecurring(): Promise<number> {
  const today = toISODate(new Date());
  const rules = await listRecurring();
  let created = 0;

  for (const rule of rules) {
    if (!rule.active) continue;
    const after = rule.lastRun ?? rule.startDate;
    // For daily rule: if never run, include startDate itself
    let latest = rule.lastRun;
    if (!rule.lastRun && rule.startDate <= today) {
      // seed the start day as first occurrence
      const tx: Transaction = {
        id: `rec-${rule.id}-${rule.startDate}`,
        type: rule.type,
        amount: rule.amount,
        category: rule.category,
        icon: rule.icon,
        note: rule.note || rule.category,
        date: new Date(`${rule.startDate}T09:00:00`).toISOString(),
      };
      await addTransaction(tx);
      created += 1;
      latest = rule.startDate;
    }

    const startFrom = latest ?? after;
    for (const isoDay of occurrences(rule, startFrom, today)) {
      const tx: Transaction = {
        id: `rec-${rule.id}-${isoDay}`,
        type: rule.type,
        amount: rule.amount,
        category: rule.category,
        icon: rule.icon,
        note: rule.note || rule.category,
        date: new Date(`${isoDay}T09:00:00`).toISOString(),
      };
      await addTransaction(tx);
      created += 1;
      latest = isoDay;
    }

    if (latest && latest !== rule.lastRun) {
      await putRecurring({ ...rule, lastRun: latest });
    }
  }

  return created;
}
