import { Link } from "@tanstack/react-router";
import { Zap, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTemplates } from "@/hooks/use-templates";
import { useTransactions } from "@/hooks/use-transactions";
import { idr } from "@/lib/format";
import type { Transaction } from "@/lib/mock-data";

export function QuickAddStrip() {
  const { templates } = useTemplates();
  const { add } = useTransactions();

  const fire = async (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    const tx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: tpl.type,
      amount: tpl.amount,
      category: tpl.category,
      icon: tpl.icon,
      note: tpl.note || tpl.label,
      date: new Date().toISOString(),
    };
    await add(tx);
    if (tpl.type === "expense") {
      const { checkBudgetAfterAdd } = await import("@/lib/budget-check");
      checkBudgetAfterAdd(tx);
    }
    toast.success(`${tpl.label} tercatat`, { description: idr(tpl.amount) });
  };

  return (
    <section className="md:col-span-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Catat cepat</h2>
        </div>
        <Link
          to="/settings"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Kelola
        </Link>
      </div>

      {templates.length === 0 ? (
        <Link
          to="/settings"
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-4 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Belum ada template. Buat template di Pengaturan.
        </Link>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => void fire(t.id)}
              className="group flex shrink-0 items-center gap-2.5 rounded-2xl border border-border bg-surface px-3 py-2.5 shadow-sm transition hover:border-primary/50 active:scale-95"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-lg">
                {t.icon}
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold leading-tight">{t.label}</div>
                <div
                  className={`text-[11px] font-medium leading-tight ${
                    t.type === "income" ? "text-income" : "text-expense"
                  }`}
                >
                  {t.type === "income" ? "+" : "−"}
                  {idr(t.amount)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
