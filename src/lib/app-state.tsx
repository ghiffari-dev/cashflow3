import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { clearTransactions, delSetting, getSetting, setSetting } from "./db";
import { generateSalt, hashPin } from "./hash";

type Theme = "light" | "dark";

type PinRecord = { salt: string; hash: string };
type RecoveryRecord = { salt: string; hash: string };

export type PinAttemptState = {
  fails: number;
  lockUntil: number; // epoch ms; 0 if not locked
};

type AppState = {
  theme: Theme;
  toggleTheme: () => void;
  unlocked: boolean;
  setUnlocked: (v: boolean) => void;
  hasPin: boolean;
  /** Returns a one-time recovery code that must be shown to the user. */
  savePin: (pin: string) => Promise<string>;
  verifyPin: (pin: string) => Promise<boolean>;
  verifyRecovery: (code: string) => Promise<boolean>;
  /** Verify recovery, then set new PIN. Returns new recovery code. Throws on invalid. */
  resetPinWithRecovery: (code: string, newPin: string) => Promise<string>;
  /** Nuclear option: wipe PIN, recovery, AND all transactions. */
  wipeEverything: () => Promise<void>;
  attempt: PinAttemptState;
  /** Reset in-memory attempt counter (called on successful unlock). */
  resetAttempts: () => void;
  hydrated: boolean;
};

const Ctx = createContext<AppState | null>(null);

const THEME_KEY = "cashflow.theme";
const PIN_SETTING = "pin";
const RECOVERY_SETTING = "recovery";

// Auto-lock timings
const IDLE_MS = 5 * 60 * 1000;
const HIDDEN_LOCK_MS = 60 * 1000;

function generateRecoveryCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

function normalizeRecovery(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function cooldownFor(fails: number): number {
  if (fails >= 10) return 5 * 60 * 1000; // 5 minutes
  if (fails >= 8) return 60 * 1000; // 1 minute
  if (fails >= 5) return 30 * 1000; // 30 seconds
  return 0;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [unlocked, setUnlockedState] = useState(false);
  const [pinRec, setPinRec] = useState<PinRecord | null>(null);
  const [recRec, setRecRec] = useState<RecoveryRecord | null>(null);
  const [attempt, setAttempt] = useState<PinAttemptState>({ fails: 0, lockUntil: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "light";
      const [pin, rec] = await Promise.all([
        getSetting<PinRecord>(PIN_SETTING),
        getSetting<RecoveryRecord>(RECOVERY_SETTING),
      ]);
      if (cancelled) return;
      setTheme(t);
      setPinRec(pin ?? null);
      setRecRec(rec ?? null);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, hydrated]);

  // --- Auto-lock: idle + visibility ---
  const idleTimerRef = useRef<number | undefined>(undefined);
  const hiddenAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!unlocked) return;
    const resetIdle = () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => setUnlockedState(false), IDLE_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
      } else {
        const hiddenFor = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
        hiddenAtRef.current = null;
        if (hiddenFor > HIDDEN_LOCK_MS) setUnlockedState(false);
        else resetIdle();
      }
    };
    const events = ["mousemove", "keydown", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);
    resetIdle();
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetIdle));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [unlocked]);

  async function persistPinAndRecovery(pin: string): Promise<string> {
    const pinSalt = generateSalt();
    const pinHash = await hashPin(pin, pinSalt);
    const pinRecord: PinRecord = { salt: pinSalt, hash: pinHash };

    const code = generateRecoveryCode();
    const recSalt = generateSalt();
    const recHash = await hashPin(normalizeRecovery(code), recSalt);
    const recRecord: RecoveryRecord = { salt: recSalt, hash: recHash };

    await setSetting(PIN_SETTING, pinRecord);
    await setSetting(RECOVERY_SETTING, recRecord);
    setPinRec(pinRecord);
    setRecRec(recRecord);
    return code;
  }

  const value: AppState = {
    theme,
    toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    unlocked,
    setUnlocked: setUnlockedState,
    hasPin: !!pinRec,
    savePin: async (p: string) => {
      const code = await persistPinAndRecovery(p);
      setAttempt({ fails: 0, lockUntil: 0 });
      setUnlockedState(true);
      return code;
    },
    verifyPin: async (p: string) => {
      if (!pinRec) return false;
      if (attempt.lockUntil && Date.now() < attempt.lockUntil) return false;
      const h = await hashPin(p, pinRec.salt);
      const ok = h === pinRec.hash;
      if (ok) {
        setAttempt({ fails: 0, lockUntil: 0 });
      } else {
        setAttempt((prev) => {
          const fails = prev.fails + 1;
          const cool = cooldownFor(fails);
          return { fails, lockUntil: cool ? Date.now() + cool : 0 };
        });
      }
      return ok;
    },
    verifyRecovery: async (code: string) => {
      if (!recRec) return false;
      const h = await hashPin(normalizeRecovery(code), recRec.salt);
      return h === recRec.hash;
    },
    resetPinWithRecovery: async (code: string, newPin: string) => {
      if (!recRec) throw new Error("Kode pemulihan tidak tersedia");
      const h = await hashPin(normalizeRecovery(code), recRec.salt);
      if (h !== recRec.hash) throw new Error("Kode pemulihan salah");
      const newCode = await persistPinAndRecovery(newPin);
      setAttempt({ fails: 0, lockUntil: 0 });
      setUnlockedState(true);
      return newCode;
    },
    wipeEverything: async () => {
      await Promise.all([
        delSetting(PIN_SETTING),
        delSetting(RECOVERY_SETTING),
        clearTransactions(),
      ]);
      setPinRec(null);
      setRecRec(null);
      setAttempt({ fails: 0, lockUntil: 0 });
      setUnlockedState(false);
    },
    attempt,
    resetAttempts: () => setAttempt({ fails: 0, lockUntil: 0 }),
    hydrated,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be inside AppStateProvider");
  return c;
}
