import { Pencil, Trash2, X } from "lucide-react";
import type { Transaction } from "@/lib/mock-data";
import { idr, shortDate } from "@/lib/format";

type Props = {
  tx: Transaction | null;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
};

export function TxDetailSheet({ tx, onClose, onEdit, onDelete }: Props) {
  if (!tx) return null;
  const isIncome = tx.type === "income";
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-background p-5 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Detail Transaksi</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center pt-2 pb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-3xl">
            {tx.icon}
          </div>
          <div className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
            {isIncome ? "Pemasukan" : "Pengeluaran"}
          </div>
          <div
            className={`mt-1 text-3xl font-bold ${
              isIncome ? "text-income" : "text-expense"
            }`}
          >
            {isIncome ? "+" : "−"}
            {idr(tx.amount)}
          </div>
        </div>

        <dl className="divide-y divide-border/60 rounded-2xl bg-surface px-4">
          <Row label="Kategori" value={tx.category} />
          <Row label="Tanggal" value={shortDate(tx.date)} />
          <Row label="Catatan" value={tx.note || "—"} />
        </dl>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => onEdit(tx)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-sm font-medium transition hover:bg-accent"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => onDelete(tx)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-expense py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90"
          >
            <Trash2 className="h-4 w-4" />
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] truncate text-right text-sm font-medium">{value}</dd>
    </div>
  );
}
