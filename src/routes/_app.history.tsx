import { createFileRoute } from "@tanstack/react-router";
import { lazy, memo, Suspense, useDeferredValue, useEffect, useMemo, useState } from "react";
import { FileText, Search, X } from "lucide-react";
import { toast } from "sonner";
import { type Transaction } from "@/lib/mock-data";
import { idr, shortDate } from "@/lib/format";
import { useTransactions } from "@/hooks/use-transactions";
import { exportPDF } from "@/lib/backup";
import { TxDetailSheet } from "@/components/tx-detail-sheet";

const TxForm = lazy(() =>
  import("@/components/tx-form").then((m) => ({ default: m.TxForm })),
);

export const Route = createFileRoute("/_app/history")({
  component: HistoryPage,
});


type Filter = "all" | "income" | "expense";

const PAGE_SIZE = 50;

function HistoryPage() {
  const { transactions, remove, update } = useTransactions();
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => set.add(t.category));
    return Array.from(set).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (category !== "all" && t.category !== category) return false;
      if (needle && !`${t.category} ${t.note}`.toLowerCase().includes(needle)) return false;
      const day = t.date.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [transactions, deferredQ, filter, category, dateFrom, dateTo]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [deferredQ, filter, category, dateFrom, dateTo]);

  const sliced = useMemo(() => filtered.slice(0, visible), [filtered, visible]);
  const grouped = useMemo(() => groupByDate(sliced), [sliced]);

  const hasDateFilter = dateFrom || dateTo;
  const hasCategoryFilter = category !== "all";


  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari kategori atau catatan..."
          className="w-full rounded-full border border-border bg-surface py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-ring"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "income", "expense"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "Semua" : f === "income" ? "Pemasukan" : "Pengeluaran"}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-surface p-3 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">Filter Lanjutan</span>
          {(hasDateFilter || hasCategoryFilter) && (
            <button
              onClick={() => {
                setCategory("all");
                setDateFrom("");
                setDateTo("");
              }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground">Kategori</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <CategoryChip active={category === "all"} onClick={() => setCategory("all")}>
              Semua
            </CategoryChip>
            {categories.map((c) => (
              <CategoryChip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </CategoryChip>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-muted-foreground">Dari</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo || undefined}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-ring"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Sampai</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-ring"
            />
          </div>
        </div>
      </div>


      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-muted-foreground">
          {filtered.length} transaksi
        </div>
        <button
          onClick={() =>
            exportPDF(filtered, {
              title: "Riwayat Transaksi",
              subtitle:
                dateFrom || dateTo
                  ? `Periode ${dateFrom || "awal"} — ${dateTo || "sekarang"}`
                  : `Total ${filtered.length} transaksi`,
            })
          }
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm transition hover:bg-accent disabled:opacity-50"
        >
          <FileText className="h-3.5 w-3.5" />
          Ekspor PDF
        </button>
      </div>

      {grouped.length === 0 && (
        <div className="rounded-2xl bg-surface p-10 text-center text-sm text-muted-foreground">
          Tidak ada transaksi.
        </div>
      )}


      {grouped.map(([date, items]) => {
        return (
          <div key={date} className="space-y-2">
            <div className="px-1">
              <div className="text-xs font-medium text-muted-foreground">{shortDate(date)}</div>
            </div>
            <div className="rounded-2xl bg-surface shadow-sm">
              {items.map((t, i) => (
                <Row
                  key={t.id}
                  tx={t}
                  isLast={i === items.length - 1}
                  onOpen={setSelected}
                />
              ))}
            </div>
          </div>
        );
      })}

      {filtered.length > visible && (
        <button
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="mx-auto block rounded-full bg-surface px-5 py-2 text-xs font-medium text-muted-foreground shadow-sm hover:text-foreground"
        >
          Muat lebih banyak ({filtered.length - visible} tersisa)
        </button>
      )}

      <TxDetailSheet
        tx={selected}
        onClose={() => setSelected(null)}
        onEdit={(tx) => {
          setEditing(tx);
          setSelected(null);
        }}
        onDelete={async (tx) => {
          if (!confirm("Hapus transaksi ini?")) return;
          await remove(tx.id);
          setSelected(null);
          toast.success("Transaksi dihapus", {
            description: `${tx.category} — ${idr(tx.amount)}`,
          });
        }}
      />

      {editing && (
        <Suspense fallback={null}>
          <TxForm
            open={!!editing}
            initial={editing}
            onClose={() => setEditing(null)}
            onSubmit={async (tx) => {
              await update(tx);
              toast.success("Transaksi diperbarui");
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

const Row = memo(function Row({
  tx,
  isLast,
  onOpen,
}: {
  tx: Transaction;
  isLast: boolean;
  onOpen: (tx: Transaction) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(tx)}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent/40 ${
        !isLast ? "border-b border-border/60" : ""
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg">
        {tx.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{tx.category}</div>
        <div className="truncate text-xs text-muted-foreground">{tx.note}</div>
      </div>
      <div
        className={`text-sm font-semibold ${
          tx.type === "income" ? "text-income" : "text-expense"
        }`}
      >
        {tx.type === "income" ? "+" : "−"}
        {idr(tx.amount)}
      </div>
    </button>
  );
});


function groupByDate(txs: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const key = t.date.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:text-foreground border border-border"
      }`}
    >
      {children}
    </button>
  );
}

