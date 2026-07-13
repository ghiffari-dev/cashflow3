import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, Delete, KeyRound, ShieldCheck, Wallet } from "lucide-react";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/lock")({
  component: LockScreen,
});

type Mode = "enter" | "setup" | "confirm" | "recover" | "recover-newpin" | "recover-confirm" | "show-code" | "wipe";

function LockScreen() {
  const {
    hasPin,
    savePin,
    verifyPin,
    verifyRecovery,
    resetPinWithRecovery,
    wipeEverything,
    unlocked,
    setUnlocked,
    hydrated,
    attempt,
  } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode | null>(null);
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [recoveryInput, setRecoveryInput] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    // Initialize once. Do NOT override after user progresses — otherwise after
    // savePin flips hasPin=true, this would push mode back to "enter" and hide
    // the recovery-code screen.
    setMode((m) => m ?? (hasPin ? "enter" : "setup"));
  }, [hydrated, hasPin]);

  // Navigation on unlock is handled by the <Navigate/> render below.
  // Do NOT also drive it from a useEffect — an unstable `navigate` ref would
  // cause an infinite router.commitLocation loop.

  const title =
    mode === "setup"
      ? "Buat PIN baru"
      : mode === "confirm"
        ? "Konfirmasi PIN"
        : mode === "recover"
          ? "Masukkan kode pemulihan"
          : mode === "recover-newpin"
            ? "Buat PIN baru"
            : mode === "recover-confirm"
              ? "Konfirmasi PIN"
              : mode === "show-code"
                ? "Simpan kode pemulihan"
                : mode === "wipe"
                  ? "Reset total aplikasi"
                  : "Masukkan PIN";

  const subtitle =
    mode === "setup"
      ? "PIN 6 digit untuk mengamankan aplikasi"
      : mode === "confirm"
        ? "Ketik ulang PIN yang sama"
        : mode === "recover"
          ? "Masukkan kode 12 karakter yang kamu simpan"
          : mode === "recover-newpin"
            ? "Buat PIN 6 digit yang baru"
            : mode === "recover-confirm"
              ? "Ketik ulang PIN baru"
              : mode === "show-code"
                ? "Kode ini hanya muncul sekali. Simpan di tempat aman — dibutuhkan jika lupa PIN."
                : mode === "wipe"
                  ? "SEMUA data transaksi akan dihapus permanen."
                  : "6 digit angka untuk membuka aplikasi";

  const isKeypadMode =
    mode === "enter" || mode === "setup" || mode === "confirm" || mode === "recover-newpin" || mode === "recover-confirm";

  const now = Date.now();
  const lockedOut = attempt.lockUntil > now && mode === "enter";
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!lockedOut) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [lockedOut]);
  void tick;
  const secondsLeft = lockedOut ? Math.max(0, Math.ceil((attempt.lockUntil - Date.now()) / 1000)) : 0;

  function handleDigit(d: string) {
    if (lockedOut) return;
    setError(null);
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 6) setTimeout(() => void submit(next), 120);
  }

  async function submit(value: string) {
    if (mode === "setup") {
      setFirstPin(value);
      setPin("");
      setMode("confirm");
      return;
    }
    if (mode === "confirm") {
      if (value === firstPin) {
        const code = await savePin(value);
        setRecoveryCode(code);
        setPin("");
        setFirstPin("");
        setMode("show-code");
      } else {
        fail("PIN tidak cocok. Coba lagi.");
        setMode("setup");
        setFirstPin("");
      }
      return;
    }
    if (mode === "recover-newpin") {
      setFirstPin(value);
      setPin("");
      setMode("recover-confirm");
      return;
    }
    if (mode === "recover-confirm") {
      if (value !== firstPin) {
        fail("PIN tidak cocok. Coba lagi.");
        setMode("recover-newpin");
        setFirstPin("");
        return;
      }
      try {
        const newCode = await resetPinWithRecovery(recoveryInput, value);
        setRecoveryCode(newCode);
        setRecoveryInput("");
        setFirstPin("");
        setPin("");
        setMode("show-code");
      } catch (e) {
        fail((e as Error).message);
        setMode("recover");
      }
      return;
    }
    if (await verifyPin(value)) setUnlocked(true);
    else {
      const remaining = attempt.lockUntil > Date.now() ? 0 : Math.max(0, 5 - (attempt.fails + 1));
      fail(remaining > 0 ? `PIN salah. Sisa ${remaining} percobaan.` : "PIN salah");
    }
  }

  function fail(msg: string) {
    setError(msg);
    setPin("");
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  function handleBackspace() {
    setError(null);
    setPin((p) => p.slice(0, -1));
  }

  if (!hydrated || mode === null) return null;
  if (unlocked && mode !== "show-code") return <Navigate to="/" />;

  // ---------- Non-keypad modes ----------
  if (mode === "show-code") {
    return (
      <FullScreen title={title} subtitle={subtitle} icon={<KeyRound className="h-8 w-8" />}>
        <div className="mt-8 w-full max-w-sm space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 p-5 text-center">
            <div className="font-mono text-2xl font-bold tracking-widest text-foreground">
              {recoveryCode}
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(recoveryCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* ignore */
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-2.5 text-sm font-medium transition hover:bg-accent"
          >
            {copied ? <Check className="h-4 w-4 text-income" /> : <Copy className="h-4 w-4" />}
            {copied ? "Tersalin" : "Salin kode"}
          </button>
          <div className="flex items-start gap-2 rounded-xl bg-accent/50 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              Tanpa kode ini, PIN yang lupa tidak bisa diatur ulang tanpa menghapus semua data.
            </div>
          </div>
          <button
            onClick={() => {
              setRecoveryCode("");
              setUnlocked(true);
              navigate({ to: "/" });
            }}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90"
          >
            Saya sudah menyimpan kode ini
          </button>
        </div>
      </FullScreen>
    );
  }

  if (mode === "recover") {
    return (
      <FullScreen title={title} subtitle={subtitle} icon={<KeyRound className="h-8 w-8" />}>
        <div className="mt-8 w-full max-w-sm space-y-3">
          <input
            autoFocus
            value={recoveryInput}
            onChange={(e) => {
              setError(null);
              setRecoveryInput(e.target.value.toUpperCase());
            }}
            placeholder="XXXX-XXXX-XXXX"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center font-mono text-lg tracking-widest outline-none focus:border-primary"
          />
          <p className="h-5 text-center text-sm text-expense">{error}</p>
          <button
            disabled={busy || recoveryInput.replace(/[^A-Z0-9]/g, "").length < 12}
            onClick={async () => {
              setBusy(true);
              const ok = await verifyRecovery(recoveryInput);
              setBusy(false);
              if (ok) {
                setError(null);
                setMode("recover-newpin");
                setPin("");
              } else {
                setError("Kode pemulihan salah");
              }
            }}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90 disabled:opacity-50"
          >
            Verifikasi kode
          </button>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => {
                setMode("enter");
                setRecoveryInput("");
                setError(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Kembali
            </button>
            <button
              onClick={() => {
                setMode("wipe");
                setError(null);
              }}
              className="text-xs text-expense hover:underline"
            >
              Kode pemulihan juga hilang?
            </button>
          </div>
        </div>
      </FullScreen>
    );
  }

  if (mode === "wipe") {
    return (
      <FullScreen title={title} subtitle={subtitle} icon={<AlertTriangle className="h-8 w-8" />}>
        <div className="mt-8 w-full max-w-sm space-y-3">
          <div className="rounded-xl border border-expense/30 bg-expense/5 p-3 text-xs text-expense">
            Tindakan ini akan menghapus SEMUA transaksi, PIN, dan kode pemulihan. Tidak dapat dibatalkan.
          </div>
          <label className="text-xs text-muted-foreground">
            Ketik <span className="font-semibold text-expense">HAPUS</span> untuk konfirmasi
          </label>
          <input
            value={wipeConfirm}
            onChange={(e) => setWipeConfirm(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center font-mono tracking-widest outline-none focus:border-expense"
          />
          <button
            disabled={busy || wipeConfirm !== "HAPUS"}
            onClick={async () => {
              setBusy(true);
              await wipeEverything();
              setBusy(false);
              setWipeConfirm("");
              setMode("setup");
            }}
            className="w-full rounded-xl bg-expense py-3 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
          >
            Hapus semua data
          </button>
          <button
            onClick={() => {
              setMode("recover");
              setWipeConfirm("");
            }}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            Batal
          </button>
        </div>
      </FullScreen>
    );
  }

  // ---------- Keypad modes ----------
  return (
    <FullScreen
      title={title}
      subtitle={subtitle}
      icon={mode === "enter" ? <ShieldCheck className="h-8 w-8" /> : <Wallet className="h-8 w-8" />}
    >
      <div
        className={`mt-10 flex gap-3 ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
        style={{ animationName: shake ? "shake" : undefined }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border transition-all ${
              i < pin.length ? "border-primary bg-primary scale-110" : "border-border bg-transparent"
            }`}
          />
        ))}
      </div>
      <p className="mt-4 h-5 text-sm text-expense">{error}</p>

      {lockedOut && (
        <div className="mb-2 rounded-xl border border-expense/30 bg-expense/5 px-4 py-3 text-center text-xs text-expense">
          Terlalu banyak percobaan. Coba lagi dalam {secondsLeft}s.
        </div>
      )}

      <div className="mt-6 w-full max-w-xs">
        <div className={`grid grid-cols-3 gap-3 ${lockedOut ? "pointer-events-none opacity-50" : ""}`}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <KeypadButton key={n} onClick={() => handleDigit(String(n))}>
              {n}
            </KeypadButton>
          ))}
          <button
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (mode === "enter") {
                setMode("recover");
                setPin("");
                setError(null);
              } else {
                setMode(hasPin ? "enter" : "setup");
                setPin("");
                setFirstPin("");
                setError(null);
              }
            }}
          >
            {mode === "enter" ? "Lupa PIN" : "Batal"}
          </button>
          <KeypadButton onClick={() => handleDigit("0")}>0</KeypadButton>
          <button
            className="flex h-16 items-center justify-center rounded-2xl text-muted-foreground transition hover:bg-accent hover:text-foreground active:scale-95"
            onClick={handleBackspace}
            aria-label="Hapus"
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
      {/* silence unused vars in keypad mode */}
      <span className="hidden">{String(isKeypadMode)}</span>
    </FullScreen>
  );
}

function FullScreen({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 py-10 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex w-full max-w-sm flex-col items-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          {icon}
        </div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function KeypadButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-16 items-center justify-center rounded-2xl bg-surface text-2xl font-medium text-foreground shadow-sm transition hover:bg-accent active:scale-95"
    >
      {children}
    </button>
  );
}
