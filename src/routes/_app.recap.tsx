import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Film, ImageIcon, Loader2, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useTransactions } from "@/hooks/use-transactions";
import { buildRecap, type Period } from "@/lib/recap";
import { RecapCard, type TemplateId } from "@/components/recap-card";

export const Route = createFileRoute("/_app/recap")({
  component: RecapPage,
});

const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "Mingguan" },
  { id: "month", label: "Bulanan" },
  { id: "custom", label: "Kustom" },
];

const TEMPLATES: { id: TemplateId; label: string; desc: string }[] = [
  { id: "overlay", label: "Overlay", desc: "Foto jadi background, statistik menempel di bawah" },
  { id: "split", label: "Split", desc: "Foto di atas, statistik di kartu bawah" },
];

function RecapPage() {
  const { transactions } = useTransactions();
  const [period, setPeriod] = useState<Period>("week");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [template, setTemplate] = useState<TemplateId>("overlay");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "png" | "video">(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(
    () => buildRecap(transactions, period, custom),
    [transactions, period, custom],
  );

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
      toast.error("Format tidak didukung — pilih gambar atau video");
      return;
    }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(f));
  };

  const exportPNG = async () => {
    if (!cardRef.current) return;
    setBusy("png");
    try {
      const { domToBlob } = await import("modern-screenshot");
      const blob = await domToBlob(cardRef.current, {
        width: 1080,
        height: 1920,
        backgroundColor: "#fff7ea",
        type: "image/png",
      });
      if (!blob) throw new Error("Gagal membuat gambar");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cashflow-recap-${stats.from}_${stats.to}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Gambar tersimpan");
    } catch (e) {
      console.error("PNG export error:", e);
      toast.error(`Gagal: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const exportVideo = async () => {
    if (!cardRef.current) return;
    setBusy("video");
    try {
      const blob = await renderRecapVideo(cardRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cashflow-recap-${stats.from}_${stats.to}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Video tersimpan");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <section className="space-y-4 rounded-2xl bg-surface p-4 shadow-sm">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Periode
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-full bg-background p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-full py-2 text-xs font-medium transition ${
                  period === p.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">
                Dari
                <input
                  type="date"
                  value={custom.from}
                  onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Sampai
                <input
                  type="date"
                  value={custom.to}
                  onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                />
              </label>
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Template
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  template === t.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <div className="text-sm font-semibold">{t.label}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {t.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Foto (opsional)
            </div>
            {photoUrl && (
              <button
                onClick={() => {
                  URL.revokeObjectURL(photoUrl);
                  setPhotoUrl(null);
                }}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-expense"
              >
                <X className="h-3 w-3" /> Hapus
              </button>
            )}
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-4 py-4 text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
            <Upload className="h-4 w-4" />
            {photoUrl ? "Ganti foto" : "Pilih foto (JPG / PNG)"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Untuk hasil terbaik gunakan foto portrait (rasio 9:16). Foto tidak diunggah — tetap di
            perangkatmu.
          </p>
        </div>
      </section>

      {/* Preview */}
      <section>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Pratinjau
        </div>
        <div className="rounded-2xl bg-surface p-3 shadow-sm">
          <div
            className="recap-frame mx-auto overflow-hidden rounded-xl bg-background"
            style={{ aspectRatio: "9 / 16", maxWidth: 420, width: "100%" }}
          >
            <div
              style={{
                width: 1080,
                height: 1920,
                transform: "scale(var(--recap-scale, 0.35))",
                transformOrigin: "top left",
              }}
            >
              <RecapCard ref={cardRef} stats={stats} photoUrl={photoUrl} template={template} />
            </div>
          </div>
        </div>
        <ScaleObserver />
      </section>

      {/* Actions */}
      <section className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={exportPNG}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow transition active:scale-95 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--brand-from), var(--brand-to))" }}
        >
          {busy === "png" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          Unduh PNG
        </button>
        <button
          onClick={exportVideo}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition active:scale-95 disabled:opacity-60"
        >
          {busy === "video" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
          Unduh Video (4 detik)
        </button>
        <div className="col-span-full flex items-start gap-2 rounded-xl bg-accent/40 p-3 text-[11px] text-muted-foreground">
          <Download className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div>
            PNG untuk feed / story instan. Video pendek (WebM) cocok diunggah ulang lewat editor —
            format ini bisa dibuka di semua browser modern & IG/WA setelah dikirim ulang.
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Fits the 1080-wide card into the surrounding container by measuring width
 * and updating a CSS var. Runs on mount + resize.
 */
function ScaleObserver() {
  useEffect(() => {
    const set = () => {
      const el = document.querySelector<HTMLDivElement>(".recap-frame");
      if (!el) return;
      const w = el.clientWidth;
      const scale = w / 1080;
      (el.firstElementChild as HTMLDivElement | null)?.style.setProperty(
        "--recap-scale",
        String(scale),
      );
    };
    set();
    const ro = new ResizeObserver(set);
    const el = document.querySelector<HTMLDivElement>(".recap-frame");
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return null;
}

// ------------------------------------------------------------------
// Video export via MediaRecorder over a canvas that plays the reveal
// ------------------------------------------------------------------
async function renderRecapVideo(node: HTMLElement): Promise<Blob> {
  const { domToDataUrl } = await import("modern-screenshot");

  // Snapshot the card once at 1080x1920
  const dataUrl = await domToDataUrl(node, {
    width: 1080,
    height: 1920,
    type: "image/png",
    backgroundColor: "#fff7ea",
  });
  const img = await loadImage(dataUrl);

  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Pick a supported mime
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  const mimeType =
    candidates.find((m) => (window as unknown as { MediaRecorder: typeof MediaRecorder }).MediaRecorder?.isTypeSupported?.(m)) ??
    "";
  if (!("MediaRecorder" in window)) {
    throw new Error("Browser tidak mendukung perekaman video");
  }

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType || "video/webm" }));
  });

  recorder.start();

  const DURATION_MS = 4000;
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      drawFrame(ctx, img, W, H, t);
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  // Hold last frame for ~400ms
  await new Promise((r) => setTimeout(r, 400));
  recorder.stop();
  return done;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
  t: number,
) {
  // Background swipe reveal + subtle zoom on the card
  ctx.fillStyle = "#fff7ea";
  ctx.fillRect(0, 0, W, H);

  const eased = easeOutCubic(t);
  const scale = 1.05 - 0.05 * eased; // 1.05 → 1.0
  const dw = W * scale;
  const dh = H * scale;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2;

  ctx.save();
  ctx.globalAlpha = Math.min(1, t * 1.4);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  // Diagonal shine sweep from top-left to bottom-right
  const sweep = -0.3 + eased * 1.6; // -0.3 → 1.3
  const gradW = W * 0.35;
  const gx = sweep * W;
  const grad = ctx.createLinearGradient(gx - gradW, 0, gx + gradW, H);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.25)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
