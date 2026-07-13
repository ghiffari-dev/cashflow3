import type { Transaction } from "./mock-data";

export type Period = "week" | "month" | "custom";

export type RecapStats = {
  from: string; // ISO date (yyyy-mm-dd)
  to: string;
  label: string; // human-readable period
  income: number;
  expense: number;
  balance: number;
  savingRate: number; // 0..1 (negative if overspent)
  txCount: number;
  daysActive: number; // unique days with tx
  streak: number; // longest consecutive-day streak in range
  topCategories: { name: string; icon: string; amount: number; pct: number }[];
  daily: { date: string; income: number; expense: number }[];
  achievements: string[];
};

function toKey(iso: string) {
  return iso.slice(0, 10);
}

function fmtRange(from: Date, to: Date, period: Period): string {
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  const optDay: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const optFull: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  if (period === "month" && sameMonth) {
    return from.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  }
  const a = from.toLocaleDateString("id-ID", optDay);
  const b = to.toLocaleDateString("id-ID", optFull);
  return `${a} – ${b}`;
}

export function rangeFor(period: Period, custom?: { from: string; to: string }): { from: Date; to: Date } {
  const now = new Date();
  if (period === "week") {
    const to = new Date(now);
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }
  const from = custom?.from ? new Date(`${custom.from}T00:00:00`) : new Date(now);
  const to = custom?.to ? new Date(`${custom.to}T23:59:59`) : new Date(now);
  return { from, to };
}

export function buildRecap(
  transactions: Transaction[],
  period: Period,
  custom?: { from: string; to: string },
): RecapStats {
  const { from, to } = rangeFor(period, custom);
  const inRange = transactions.filter((t) => {
    const d = new Date(t.date).getTime();
    return d >= from.getTime() && d <= to.getTime();
  });

  const income = inRange.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = inRange.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const savingRate = income > 0 ? balance / income : 0;

  // Top expense categories
  const byCat = new Map<string, { name: string; icon: string; amount: number }>();
  for (const t of inRange) {
    if (t.type !== "expense") continue;
    const prev = byCat.get(t.category);
    if (prev) prev.amount += t.amount;
    else byCat.set(t.category, { name: t.category, icon: t.icon, amount: t.amount });
  }
  const totalExp = expense || 1;
  const topCategories = [...byCat.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((c) => ({ ...c, pct: c.amount / totalExp }));

  // Daily buckets (fills gaps for chart continuity)
  const daysMap = new Map<string, { income: number; expense: number }>();
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= to.getTime()) {
    daysMap.set(toKey(cursor.toISOString()), { income: 0, expense: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  const activeDays = new Set<string>();
  for (const t of inRange) {
    const k = toKey(t.date);
    const bucket = daysMap.get(k) ?? { income: 0, expense: 0 };
    if (t.type === "income") bucket.income += t.amount;
    else bucket.expense += t.amount;
    daysMap.set(k, bucket);
    activeDays.add(k);
  }
  const daily = [...daysMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // Streak: longest consecutive day run where user logged a tx
  let streak = 0;
  let cur = 0;
  for (const d of daily) {
    if (activeDays.has(d.date)) {
      cur += 1;
      if (cur > streak) streak = cur;
    } else cur = 0;
  }

  // Achievements
  const achievements: string[] = [];
  if (streak >= 3) achievements.push(`🔥 Streak ${streak} hari catat rutin`);
  if (savingRate >= 0.3) achievements.push(`💰 Nabung ${Math.round(savingRate * 100)}% pendapatan`);
  else if (savingRate >= 0.1) achievements.push(`✨ Saldo positif ${Math.round(savingRate * 100)}%`);
  if (topCategories[0] && topCategories[0].pct < 0.4 && topCategories.length >= 3)
    achievements.push("⚖️ Pengeluaran seimbang antar kategori");
  if (inRange.length >= 20) achievements.push(`📊 ${inRange.length} transaksi tercatat`);

  return {
    from: toKey(from.toISOString()),
    to: toKey(to.toISOString()),
    label: fmtRange(from, to, period),
    income,
    expense,
    balance,
    savingRate,
    txCount: inRange.length,
    daysActive: activeDays.size,
    streak,
    topCategories,
    daily,
    achievements,
  };
}
