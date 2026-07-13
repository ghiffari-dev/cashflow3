import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Plus,
  Target,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useBudgets } from "@/hooks/use-budgets";
import { exportCSV, exportJSON, exportPDF, parseCSVFile, parseJSONFile } from "@/lib/backup";
import { isDefault, type TxKind } from "@/lib/categories";
import { idr } from "@/lib/format";
import type { Transaction } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

const EMOJIS = ["🍜","🚕","🛍️","🧾","🎬","💊","📚","🏠","☕","🎮","💼","💻","🎁","📈","✨","🧩","🎨","🚗","🐶","💡","🛒","🍔","🍕","🏥","✈️","🎯","💰","💵"];

function SettingsPage() {
  const { transactions, replace, seed, clear } = useTransactions();
  const [busy, setBusy] = useState<string | null>(null);

  const doExport = async (fn: () => void | Promise<void>) => {
    try {
      setBusy("export");
      await fn();
      toast.success("Berhasil diekspor");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <CategoriesSection />
      <BudgetsSection />

      <Section title="Backup Data" subtitle="Simpan seluruh data transaksi ke file. Simpan file ini di tempat aman.">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            icon={<FileJson className="h-5 w-5" />}
            title="Ekspor JSON"
            desc="Format lengkap untuk backup & restore antar perangkat."
            action="Unduh JSON"
            disabled={busy !== null || transactions.length === 0}
            onClick={() => doExport(() => exportJSON(transactions))}
          />
          <ActionCard
            icon={<FileSpreadsheet className="h-5 w-5" />}
            title="Ekspor CSV"
            desc="Bisa dibuka di Excel / Google Sheets."
            action="Unduh CSV"
            disabled={busy !== null || transactions.length === 0}
            onClick={() => doExport(() => exportCSV(transactions))}
          />
          <ActionCard
            icon={<FileText className="h-5 w-5" />}
            title="Ekspor PDF"
            desc="Laporan rapi dengan ringkasan dan tabel transaksi."
            action="Unduh PDF"
            disabled={busy !== null || transactions.length === 0}
            onClick={() =>
              doExport(() =>
                exportPDF(transactions, {
                  title: "Laporan CashFlow",
                  subtitle: `Total ${transactions.length} transaksi`,
                }),
              )
            }
          />
        </div>
      </Section>

      <ImportSection
        onImport={async (items, mode) => {
          if (mode === "replace") await replace(items);
          else await seed(items);
        }}
      />

      <Section title="Zona Bahaya" subtitle="Aksi berikut tidak dapat dibatalkan.">
        <div className="rounded-2xl border border-expense/20 bg-expense/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-expense" />
            <div className="flex-1">
              <div className="text-sm font-medium text-expense">Hapus semua transaksi</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Semua {transactions.length} transaksi akan dihapus dari perangkat ini. Backup dulu jika perlu.
              </div>
              <button
                onClick={async () => {
                  if (!confirm("Yakin hapus SEMUA transaksi? Aksi ini tidak dapat dibatalkan.")) return;
                  await clear();
                  toast.success("Semua transaksi dihapus");
                }}
                disabled={busy !== null || transactions.length === 0}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-expense px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Hapus semua
              </button>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ---------- Categories ----------
function CategoriesSection() {
  const { all, add, remove } = useCategories();
  const [tab, setTab] = useState<TxKind>("expense");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🧩");

  return (
    <Section
      title="Kategori"
      subtitle="Tambah kategori kustom untuk pencatatan yang lebih rapi."
    >
      <div className="rounded-2xl bg-surface p-4 shadow-sm">
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-background p-1">
          {(["expense", "income"] as TxKind[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full py-2 text-xs font-medium transition ${
                tab === t ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
              }`}
            >
              {t === "income" ? "Pemasukan" : "Pengeluaran"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {all[tab].map((c) => {
            const def = isDefault(tab, c.name);
            return (
              <span
                key={c.name}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                  def
                    ? "bg-background text-muted-foreground border border-border"
                    : "bg-primary/10 text-foreground border border-primary/30"
                }`}
              >
                <span>{c.icon}</span>
                {c.name}
                {!def && (
                  <button
                    onClick={async () => {
                      await remove(tab, c.name);
                      toast.success("Kategori dihapus");
                    }}
                    aria-label={`Hapus ${c.name}`}
                    className="ml-0.5 text-muted-foreground hover:text-expense"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>

        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah kategori
          </button>
        ) : (
          <div className="mt-4 space-y-3 rounded-xl border border-border bg-background p-3">
            <div>
              <label className="text-[11px] text-muted-foreground">Nama kategori</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Investasi Kripto"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Emoji</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setIcon(e)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition ${
                      icon === e ? "bg-primary/20 ring-2 ring-primary" : "bg-surface hover:bg-accent"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await add(tab, { name, icon });
                    toast.success("Kategori ditambahkan");
                    setAdding(false);
                    setName("");
                    setIcon("🧩");
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
                disabled={!name.trim()}
                className="flex-1 rounded-lg py-2 text-xs font-semibold text-primary-foreground shadow disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, var(--brand-from), var(--brand-to))" }}
              >
                Simpan
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setName("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

// ---------- Budgets ----------
function BudgetsSection() {
  const { all } = useCategories();
  const { budgets, upsert, remove } = useBudgets();
  const [category, setCategory] = useState(all.expense[0]?.name ?? "");
  const [limit, setLimit] = useState("");

  return (
    <Section
      title="Anggaran Bulanan"
      subtitle="Tetapkan batas pengeluaran per kategori. Kamu akan diingatkan saat mendekati batas."
    >
      <div className="rounded-2xl bg-surface p-4 shadow-sm space-y-4">
        {budgets.length > 0 && (
          <div className="space-y-2">
            {budgets.map((b) => (
              <div key={b.category} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-medium">{b.category}</div>
                    <div className="text-xs text-muted-foreground">{idr(b.limit)} / bulan</div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await remove(b.category);
                    toast.success("Anggaran dihapus");
                  }}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-expense"
                  aria-label="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          >
            {all.expense.map((c) => (
              <option key={c.name} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <input
            inputMode="numeric"
            value={limit ? Number(limit.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
            onChange={(e) => setLimit(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Batas (Rp)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
          <button
            onClick={async () => {
              const n = Number(limit.replace(/[^\d]/g, ""));
              if (!category || !n) {
                toast.error("Isi kategori dan batas nominal");
                return;
              }
              await upsert({ category, limit: n });
              toast.success(`Anggaran ${category} disimpan`);
              setLimit("");
            }}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-primary-foreground shadow"
            style={{ background: "linear-gradient(135deg, var(--brand-from), var(--brand-to))" }}
          >
            Simpan
          </button>
        </div>
      </div>
    </Section>
  );
}

// ---------- Import ----------
function ImportSection({
  onImport,
}: {
  onImport: (items: Transaction[], mode: "merge" | "replace") => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    try {
      setBusy(true);
      let items: Transaction[] = [];
      if (file.name.toLowerCase().endsWith(".csv")) items = await parseCSVFile(file);
      else items = await parseJSONFile(file);
      if (items.length === 0) {
        toast.error("File kosong atau tidak valid");
        return;
      }
      const msg =
        mode === "replace"
          ? `Impor ${items.length} transaksi & GANTI semua data yang ada?`
          : `Impor ${items.length} transaksi (gabung dengan data yang ada)?`;
      if (!confirm(msg)) return;
      await onImport(items, mode);
      toast.success(`${items.length} transaksi diimpor`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Section
      title="Impor Data"
      subtitle="Muat file JSON atau CSV dari backup sebelumnya."
    >
      <div className="rounded-2xl bg-surface p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-background p-1">
          {(["merge", "replace"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full py-2 text-xs font-medium transition ${
                mode === m ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
              }`}
            >
              {m === "merge" ? "Gabungkan" : "Ganti semua"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === "merge"
            ? "Transaksi baru ditambahkan; ID yang sama akan ditimpa."
            : "Semua data lama dihapus lalu diganti dengan file baru."}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv,application/json,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {busy ? "Memproses..." : "Pilih file (.json / .csv)"}
        </button>
      </div>
    </Section>
  );
}

// ---------- Layout helpers ----------
function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ActionCard({
  icon,
  title,
  desc,
  action,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
          {icon}
        </div>
        <div className="text-sm font-medium">{title}</div>
      </div>
      <p className="mt-2 flex-1 text-xs text-muted-foreground">{desc}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-primary-foreground shadow transition hover:opacity-90 active:scale-95 disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, var(--brand-from), var(--brand-to))" }}
      >
        <Download className="h-3.5 w-3.5" />
        {action}
      </button>
    </div>
  );
}
