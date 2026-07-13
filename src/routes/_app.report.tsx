import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTransactions } from "@/hooks/use-transactions";
import { idr, monthName } from "@/lib/format";


export const Route = createFileRoute("/_app/report")({
  component: ReportPage,
});

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
  fontSize: 12,
};

function ReportPage() {
  const { transactions } = useTransactions();

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    transactions.filter((t) => t.type === "expense").forEach((t) => {
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const byMonth = useMemo(() => {
    const map = new Map<number, { income: number; expense: number }>();
    transactions.forEach((t) => {
      const m = new Date(t.date).getMonth();
      const cur = map.get(m) ?? { income: 0, expense: 0 };
      if (t.type === "income") cur.income += t.amount;
      else cur.expense += t.amount;
      map.set(m, cur);
    });
    return Array.from(map.entries())
      .map(([m, v]) => ({
        month: monthName(m),
        ...v,
        net: v.income - v.expense,
      }))
      .sort(
        (a, b) =>
          new Date(`${a.month} 1, 2000`).getMonth() -
          new Date(`${b.month} 1, 2000`).getMonth(),
      );
  }, [transactions]);

  const dailyCashflow = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    transactions.forEach((t) => {
      const key = t.date.slice(0, 10);
      const cur = map.get(key) ?? { income: 0, expense: 0 };
      if (t.type === "income") cur.income += t.amount;
      else cur.expense += t.amount;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, v]) => ({
        date: date.slice(5),
        income: v.income,
        expense: v.expense,
      }));
  }, [transactions]);


  const savingsTrend = useMemo(() => {
    let acc = 0;
    return byMonth.map((m) => {
      acc += m.net;
      return { month: m.month, saldo: acc };
    });
  }, [byMonth]);

  const totalExpense = byCategory.reduce((s, x) => s + x.value, 0);
  const totalIncome = byMonth.reduce((s, m) => s + m.income, 0);
  const savingRate =
    totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
  const avgDailyExpense =
    dailyCashflow.length > 0
      ? dailyCashflow.reduce((s, d) => s + d.expense, 0) / dailyCashflow.length
      : 0;
  const topCategory = byCategory[0];

  return (
    <div className="space-y-6">
      {/* Ringkasan */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Pemasukan" value={idr(totalIncome)} tone="income" />
        <StatCard label="Total Pengeluaran" value={idr(totalExpense)} tone="expense" />
        <StatCard label="Saving Rate" value={`${savingRate}%`} />
        <StatCard label="Rata-rata / Hari" value={idr(Math.round(avgDailyExpense))} />
      </section>

      {/* Pie kategori */}
      <section className="rounded-2xl bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Pengeluaran per Kategori</h2>
        <p className="text-xs text-muted-foreground">
          {topCategory ? `Terbesar: ${topCategory.name}` : "Belum ada data"}
        </p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => idr(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-xs">
          {byCategory.map((c, i) => (
            <div key={c.name} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="truncate text-muted-foreground">{c.name}</span>
              <span className="ml-auto font-medium">
                {Math.round((c.value / totalExpense) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Bulanan */}
      <section className="rounded-2xl bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Perbandingan Bulanan</h2>
        <p className="text-xs text-muted-foreground">Pemasukan vs Pengeluaran</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byMonth}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`}
              />
              <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={tooltipStyle} formatter={(v) => idr(Number(v))} />
              <Bar dataKey="income" fill="var(--income)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="var(--expense)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Saldo kumulatif */}
      <section className="rounded-2xl bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Tren Saldo Kumulatif</h2>
        <p className="text-xs text-muted-foreground">Akumulasi saldo dari bulan ke bulan</p>
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={savingsTrend}>
              <defs>
                <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-from)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--brand-to)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => idr(Number(v))} />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke="var(--brand-from)"
                strokeWidth={2}
                fill="url(#saldoGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Cashflow harian */}
      <section className="rounded-2xl bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Arus Kas Harian</h2>
        <p className="text-xs text-muted-foreground">Pemasukan & pengeluaran tiap hari</p>
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyCashflow}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1_000).toFixed(0)}k`}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => idr(Number(v))} />
              <Line type="monotone" dataKey="income" stroke="var(--income)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expense" stroke="var(--expense)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Top kategori bar horizontal */}
      <section className="rounded-2xl bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Top Kategori Pengeluaran</h2>
        <p className="text-xs text-muted-foreground">Peringkat kategori terbesar</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCategory} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={tooltipStyle} formatter={(v) => idr(Number(v))} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "income" | "expense";
}) {
  const color =
    tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-foreground";
  return (
    <div className="rounded-2xl bg-surface p-3 shadow-sm">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}
