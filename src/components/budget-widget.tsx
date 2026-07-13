import { useMemo } from "react";
import { Target } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useBudgets } from "@/hooks/use-budgets";
import { useTransactions } from "@/hooks/use-transactions";
import { idr } from "@/lib/format";

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function BudgetWidget() {
  const { budgets } = useBudgets();
  const { transactions } = useTransactions();

  const rows = useMemo(() => {
    const nowKey = new Date().toISOString().slice(0, 7);
    return budgets.map((b) => {
      const spent = transactions
        .filter(
          (t) =>
            t.type === "expense" &&
            t.category === b.category &&
            monthKey(t.date) === nowKey,
        )
        .reduce((s, t) => s + t.amount, 0);
      const pct = b.limit > 0 ? Math.min(spent / b.limit, 1.2) : 0;
      return { ...b, spent, pct };
    });
  }, [budgets, transactions]);

  return (
    <section className="md:col-span-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-primary" />
          Anggaran Bulan Ini
        </h2>
        <Link to="/settings" className="text-xs text-muted-foreground hover:text-foreground">
          Atur
        </Link>
      </div>

      {rows.length === 0 ? (
        <Link
          to="/settings"
          className="block rounded-2xl bg-surface p-5 text-center text-sm text-muted-foreground shadow-sm hover:bg-accent"
        >
          Belum ada anggaran. Ketuk untuk mengatur batas per kategori.
        </Link>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => {
            const pctInt = Math.round(r.pct * 100);
            const tone =
              r.pct >= 1
                ? { bar: "bg-expense", text: "text-expense" }
                : r.pct >= 0.8
                  ? { bar: "bg-primary", text: "text-primary" }
                  : { bar: "bg-income", text: "text-income" };
            return (
              <div key={r.category} className="rounded-2xl bg-surface p-4 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-medium">{r.category}</div>
                  <div className={`text-xs font-semibold ${tone.text}`}>{pctInt}%</div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent">
                  <div
                    className={`h-full ${tone.bar} transition-all`}
                    style={{ width: `${Math.min(pctInt, 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{idr(r.spent)}</span>
                  <span>dari {idr(r.limit)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
