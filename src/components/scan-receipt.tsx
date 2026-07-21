import { useEffect, useRef, useState } from "react";
import { X, Upload, ScanLine, Pencil, Loader2, RefreshCw } from "lucide-react";
import type { Transaction } from "@/lib/mock-data";
import { iconFor } from "@/lib/categories";
import { useCategories } from "@/hooks/use-categories";
import { scanReceipt, type OcrProgress } from "@/lib/ocr";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (tx: Transaction) => Promise<void> | void;
};

type Stage = "pick" | "scanning" | "review";

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function ScanReceipt({ open, onClose, onSubmit }: Props) {
  const { all: CATS, custom } = useCategories();
  const [stage, setStage] = useState<Stage>("pick");
  const [progress, setProgress] = useState<OcrProgress>({ status: "", progress: 0 });
  const [preview, setPreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-filled values (as detected)
  const [autoMerchant, setAutoMerchant] = useState("");
  const [autoTotal, setAutoTotal] = useState(0);
  const [autoDate, setAutoDate] = useState(todayISO());

  // Editable values
  const [merchant, setMerchant] = useState("");
  const [total, setTotal] = useState("");
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState("Belanja");

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setStage("pick");
      setPreview(null);
      setProgress({ status: "", progress: 0 });
      setRawText("");
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setStage("scanning");
    setProgress({ status: "menyiapkan", progress: 0 });
    try {
      const res = await scanReceipt(file, (p) => setProgress(p));
      setAutoMerchant(res.merchant);
      setAutoTotal(res.total);
      setAutoDate(res.date);
      setMerchant(res.merchant);
      setTotal(res.total ? String(res.total) : "");
      setDate(res.date);
      setRawText(res.rawText);
      setStage("review");
    } catch (e) {
      console.error(e);
      alert("Gagal memindai struk. Coba foto yang lebih jelas.");
      setStage("pick");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(total.replace(/[^\d]/g, ""));
    if (!n || n <= 0) return;
    setSaving(true);
    const tx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "expense",
      amount: n,
      category,
      icon: iconFor("expense", category, custom),
      note: merchant.trim() || "Struk Belanja",
      date: new Date(`${date}T12:00:00`).toISOString(),
    };
    try {
      await onSubmit(tx);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const merchantEdited = stage === "review" && merchant.trim() !== autoMerchant.trim();
  const totalEdited =
    stage === "review" && Number(total.replace(/[^\d]/g, "")) !== autoTotal;
  const dateEdited = stage === "review" && date !== autoDate;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground"
              style={{ background: "linear-gradient(135deg, var(--brand-from), var(--brand-to))" }}
            >
              <ScanLine className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold">Pindai Struk</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 pb-5">
          {stage === "pick" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ambil foto struk atau pilih dari galeri. Hasil pindai bisa kamu koreksi sebelum disimpan.
              </p>

              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold text-primary-foreground shadow"
                style={{
                  background: "linear-gradient(135deg, var(--brand-from), var(--brand-to))",
                }}
              >
                <ScanLine className="h-4 w-4" />
                Ambil foto struk
              </button>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-sm font-medium hover:bg-accent"
              >
                <Upload className="h-4 w-4" />
                Pilih dari galeri
              </button>

              <p className="pt-2 text-center text-[11px] text-muted-foreground">
                Pemindaian dilakukan di perangkatmu. Foto tidak dikirim ke server.
              </p>
            </div>
          )}

          {stage === "scanning" && (
            <div className="space-y-4 py-4">
              {preview && (
                <img
                  src={preview}
                  alt="Struk"
                  className="mx-auto max-h-56 rounded-xl border border-border object-contain"
                />
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progress.status || "memindai..."}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round((progress.progress || 0) * 100)}%`,
                    background: "linear-gradient(90deg, var(--brand-from), var(--brand-to))",
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pemindaian pertama butuh 10–30 detik untuk mengunduh model OCR. Selanjutnya jauh lebih cepat.
              </p>
            </div>
          )}

          {stage === "review" && (
            <form onSubmit={handleSave} className="space-y-4">
              {preview && (
                <div className="flex gap-3">
                  <img
                    src={preview}
                    alt="Struk"
                    className="h-24 w-20 shrink-0 rounded-lg border border-border object-cover"
                  />
                  <div className="flex-1 text-xs text-muted-foreground">
                    Hasil pindai sudah terisi otomatis. Ubah kolom yang tidak sesuai — kolom yang kamu edit akan diberi tanda.
                    <button
                      type="button"
                      onClick={() => {
                        setStage("pick");
                        setPreview(null);
                      }}
                      className="mt-2 flex items-center gap-1 text-primary hover:underline"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Pindai ulang
                    </button>
                  </div>
                </div>
              )}

              <Field label="Nominal (Rp)" edited={totalEdited}>
                <input
                  inputMode="numeric"
                  value={total ? Number(total.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
                  onChange={(e) => setTotal(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="0"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-2xl font-semibold outline-none focus:border-ring"
                />
              </Field>

              <Field label="Toko / Catatan" edited={merchantEdited}>
                <input
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-ring"
                />
              </Field>

              <Field label="Tanggal" edited={dateEdited}>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={todayISO()}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-ring"
                />
              </Field>

              <div>
                <label className="text-xs text-muted-foreground">Kategori</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {CATS.expense.map((c) => (
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

              {rawText && (
                <details className="rounded-xl bg-surface p-3 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Teks mentah hasil OCR</summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
                    {rawText}
                  </pre>
                </details>
              )}

              <button
                type="submit"
                disabled={saving || !total}
                className="w-full rounded-full py-3 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--brand-from), var(--brand-to))",
                }}
              >
                {saving ? "Menyimpan..." : "Simpan Transaksi"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  edited,
  children,
}: {
  label: string;
  edited: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <label className="text-xs text-muted-foreground">{label}</label>
        {edited && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            <Pencil className="h-2.5 w-2.5" />
            diedit
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
