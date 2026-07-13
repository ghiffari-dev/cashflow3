import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Transaction, TxType } from "@/lib/mock-data";
import { iconFor } from "@/lib/categories";
import { useCategories } from "@/hooks/use-categories";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (tx: Transaction) => Promise<void> | void;
  initial?: Transaction | null;
};

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function TxForm({ open, onClose, onSubmit, initial }: Props) {
  const { all: CATS, custom } = useCategories();
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATS.expense[0]?.name ?? "Lainnya");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setType(initial.type);
      setAmount(String(initial.amount));
      setCategory(initial.category);
      setNote(initial.note);
      setDate(initial.date.slice(0, 10));
    } else {
      setType("expense");
      setAmount("");
      setCategory("Makan");
      setNote("");
      setDate(todayISO());
    }
    // Only reset when the form (re)opens or the edited tx changes.
    // Do NOT depend on CATS — it's a fresh reference every render and would
    // wipe user input on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  useEffect(() => {
    if (!CATS[type].some((c) => c.name === category)) {
      setCategory(CATS[type][0]?.name ?? "Lainnya");
    }
  }, [type, category, CATS]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount.replace(/[^\d]/g, ""));
    if (!n || n <= 0) return;
    setSaving(true);
    const tx: Transaction = {
      id: initial?.id ?? `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      amount: n,
      category,
      icon: iconFor(type, category, custom),
      note: note.trim() || category,
      date: new Date(`${date}T12:00:00`).toISOString(),
    };
    try {
      await onSubmit(tx);
      onClose();
    } finally {
      setSaving(false);
    }
  }

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
          <h2 className="text-base font-semibold">
            {initial ? "Ubah Transaksi" : "Tambah Transaksi"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1">
            {(["expense", "income"] as TxType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-full py-2 text-sm font-medium transition ${
                  type === t
                    ? t === "income"
                      ? "bg-income text-white shadow"
                      : "bg-expense text-white shadow"
                    : "text-muted-foreground"
                }`}
              >
                {t === "income" ? "Pemasukan" : "Pengeluaran"}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-muted-foreground">Nominal (Rp)</label>
            <input
              inputMode="numeric"
              autoFocus
              value={amount ? Number(amount.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="0"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-3 text-2xl font-semibold outline-none focus:border-ring"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-muted-foreground">Kategori</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CATS[type].map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCategory(c.name)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    category === c.name
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-muted-foreground hover:text-foreground border border-border"
                  }`}
                >
                  <span>{c.icon}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs text-muted-foreground">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayISO()}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-ring"
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-muted-foreground">Catatan (opsional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: makan siang di kantin"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-ring"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !amount}
            className="w-full rounded-full py-3 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--brand-from), var(--brand-to))",
            }}
          >
            {saving ? "Menyimpan..." : initial ? "Simpan Perubahan" : "Simpan Transaksi"}
          </button>
        </form>
      </div>
    </div>
  );
}
