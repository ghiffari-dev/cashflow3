import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { useMemo } from "react";
import { useTransactions } from "@/hooks/use-transactions";
import { MOCK_TXS } from "@/lib/mock-data";
import { idr, shortDate } from "@/lib/format";
import { BudgetWidget } from "@/components/budget-widget";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  const { transactions: txs, loaded, seed } = useTransactions();

  const { income, expense, balance, thisMonthCount, recent, avg } = useMemo(() => {
    const now = new Date();
    const thisMonth = txs.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const income = thisMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = thisMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const balance = txs.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
    const avg = thisMonth.length ? Math.round((income + expense) / thisMonth.length) : 0;
    return {
      income,
      expense,
      balance,
      thisMonthCount: thisMonth.length,
      recent: txs.slice(0, 6),
      avg,
    };
  }, [txs]);

  return (
    <div className="space-y-6 md:grid md:grid-cols-3 md:gap-5 md:space-y-0 lg:gap-6">
      <section
        className="rounded-3xl p-5 text-primary-foreground shadow-lg md:col-span-3 md:p-6 lg:col-span-2 lg:p-7"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-from) 0%, var(--brand-to) 100%)",
        }}
      >
        <div className="flex items-center gap-2 text-sm opacity-90">
          <Wallet className="h-4 w-4" />
          <span>Saldo saat ini</span>
        </div>
        <div className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
          {idr(balance)}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <MiniStat
            label="Pemasukan"
            value={idr(income)}
            icon={<ArrowDownLeft className="h-4 w-4" />}
          />
          <MiniStat
            label="Pengeluaran"
            value={idr(expense)}
            icon={<ArrowUpRight className="h-4 w-4" />}
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:col-span-3 md:grid-cols-3 lg:col-span-1 lg:grid-cols-1">
        <StatCard
          label="Selisih bulan ini"
          value={idr(income - expense)}
          tone={income - expense >= 0 ? "income" : "expense"}
        />
        <StatCard label="Transaksi" value={`${thisMonthCount}`} tone="neutral" />
        <StatCard label="Rata-rata / transaksi" value={idr(avg)} tone="neutral" />
      </section>

      <BudgetWidget />

      <section className="md:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Transaksi Terakhir</h2>
          <Link to="/history" className="text-xs text-muted-foreground hover:text-foreground">
            Lihat semua
          </Link>
        </div>

        {loaded && recent.length === 0 ? (
          <div className="rounded-2xl bg-surface p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-3 text-sm font-medium">Belum ada transaksi</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Tambahkan transaksi pertama, atau isi data contoh untuk mencoba.
            </p>
            <button
              onClick={() => void seed(MOCK_TXS)}
              className="mt-4 inline-flex rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-accent"
            >
              Isi data contoh
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface shadow-sm">
            {recent.map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i !== recent.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-lg">
                  {t.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.category}</div>
                  <div className="text-xs text-muted-foreground">{shortDate(t.date)}</div>
                </div>
                <div
                  className={`shrink-0 text-sm font-semibold ${
                    t.type === "income" ? "text-income" : "text-expense"
                  }`}
                >
                  {t.type === "income" ? "+" : "−"}
                  {idr(t.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-primary-foreground/10 px-3 py-2.5 backdrop-blur">
      <div className="flex items-center gap-1.5 text-xs opacity-80">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
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
  tone: "income" | "expense" | "neutral";
}) {
  const toneClass =
    tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-foreground";
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
