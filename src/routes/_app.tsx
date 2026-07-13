import { createFileRoute, Link, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { Home, History, PieChart, Moon, Sun, Plus, Lock, Wallet, Settings, Sparkles } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useApp } from "@/lib/app-state";
import { useTransactions } from "@/hooks/use-transactions";

const TxForm = lazy(() =>
  import("@/components/tx-form").then((m) => ({ default: m.TxForm })),
);

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});


const NAV = [
  { to: "/", label: "Dashboard", icon: Home, exact: true },
  { to: "/history", label: "Riwayat", icon: History, exact: false },
  { to: "/report", label: "Laporan", icon: PieChart, exact: false },
  { to: "/recap", label: "Recap", icon: Sparkles, exact: false },
  { to: "/settings", label: "Pengaturan", icon: Settings, exact: false },
] as const;


function AppLayout() {
  const { unlocked, hydrated, theme, toggleTheme, setUnlocked } = useApp();
  const { add } = useTransactions();
  const [formOpen, setFormOpen] = useState(false);
  const location = useLocation();


  if (!hydrated) return <div className="min-h-[100dvh] bg-background" />;
  if (!unlocked) return <Navigate to="/lock" />;

  const currentTitle =
    location.pathname === "/"
      ? "Dashboard"
      : location.pathname.startsWith("/history")
        ? "Riwayat"
        : location.pathname.startsWith("/report")
          ? "Laporan"
          : location.pathname.startsWith("/recap")
            ? "Recap"
            : location.pathname.startsWith("/settings")
              ? "Pengaturan"
              : "CashFlow";


  return (
    <div className="min-h-[100dvh] bg-background text-foreground lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-border/60 bg-surface px-4 py-6 lg:flex">
        <div className="flex items-center gap-2 px-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground shadow"
            style={{ background: "linear-gradient(135deg, var(--brand-from), var(--brand-to))" }}
          >
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">CashFlow</div>
            <div className="text-xs text-muted-foreground leading-tight">Pencatat Keuangan</div>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
              activeProps={{
                className:
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium bg-accent text-accent-foreground",
              }}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            {theme === "dark" ? "Mode terang" : "Mode gelap"}
          </button>
          <button
            onClick={() => setUnlocked(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <Lock className="h-4.5 w-4.5" />
            Kunci aplikasi
          </button>
        </div>
      </aside>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile / tablet header */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur lg:hidden">
          <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6 md:max-w-3xl md:px-8">
            <h1 className="truncate text-base font-semibold tracking-tight">{currentTitle}</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                aria-label="Ganti tema"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setUnlocked(false)}
                aria-label="Kunci aplikasi"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <Lock className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Desktop page title */}
        <div className="hidden lg:block border-b border-border/60 bg-background/60 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-8">
            <h1 className="text-xl font-semibold tracking-tight">{currentTitle}</h1>
            <button
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90 active:scale-95"
              style={{
                background: "linear-gradient(135deg, var(--brand-from), var(--brand-to))",
              }}
              onClick={() => setFormOpen(true)}

            >
              <Plus className="h-4 w-4" />
              Tambah transaksi
            </button>
          </div>
        </div>

        <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-4 sm:px-6 md:max-w-3xl md:px-8 md:pt-6 lg:max-w-5xl lg:pb-10 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile FAB */}
      <button
        aria-label="Tambah transaksi"
        className="fixed bottom-24 left-1/2 z-40 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full text-primary-foreground shadow-xl transition hover:scale-105 active:scale-95 lg:hidden"
        style={{ background: "linear-gradient(135deg, var(--brand-from), var(--brand-to))" }}
        onClick={() => setFormOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-around px-4 py-2">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="flex flex-1 flex-col items-center gap-1 py-1.5 text-muted-foreground transition"
              activeProps={{
                className:
                  "flex flex-1 flex-col items-center gap-1 py-1.5 text-primary",
              }}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {formOpen && (
        <Suspense fallback={null}>
          <TxForm
            open={formOpen}
            onClose={() => setFormOpen(false)}
            onSubmit={async (tx) => {
              await add(tx);
              const { checkBudgetAfterAdd } = await import("@/lib/budget-check");
              checkBudgetAfterAdd(tx);
            }}
          />
        </Suspense>
      )}

    </div>
  );
}

