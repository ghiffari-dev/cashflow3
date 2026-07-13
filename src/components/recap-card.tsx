import { forwardRef, useMemo } from "react";
import type { RecapStats } from "@/lib/recap";
import { idr } from "@/lib/format";

export type TemplateId = "overlay" | "split";

type Props = {
  stats: RecapStats;
  photoUrl?: string | null;
  template: TemplateId;
};

/**
 * A 1080x1350 (4:5) share card. Rendered as a plain <div> for
 * snapshot via html-to-image and for MediaRecorder capture.
 * All colors match the app's brand tokens.
 */
export const RecapCard = forwardRef<HTMLDivElement, Props>(function RecapCard(
  { stats, photoUrl, template },
  ref,
) {
  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        position: "relative",
        overflow: "hidden",
        fontFamily:
          '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto',
        color: "#1a0f00",
        background: "linear-gradient(160deg, #fff7ea 0%, #ffe6bf 100%)",
      }}
    >
      {template === "overlay" ? (
        <OverlayTemplate stats={stats} photoUrl={photoUrl} />
      ) : (
        <SplitTemplate stats={stats} photoUrl={photoUrl} />
      )}
    </div>
  );
});

// ------------------------------------------------------------------
// Overlay: photo as full background with gradient scrim + stats
// ------------------------------------------------------------------
function OverlayTemplate({ stats, photoUrl }: { stats: RecapStats; photoUrl?: string | null }) {
  return (
    <>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(120% 80% at 20% 10%, #ffd280 0%, transparent 60%), radial-gradient(90% 70% at 80% 90%, #ff8f3d 0%, transparent 55%), linear-gradient(160deg, #ffb44a, #ff7a1a)",
          }}
        />
      )}
      {/* Scrims */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(20,10,0,0.55) 0%, rgba(20,10,0,0.15) 30%, rgba(20,10,0,0.15) 55%, rgba(20,10,0,0.85) 100%)",
        }}
      />


      {/* Bottom sheet with stats — transparent, no background plate */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          bottom: 60,
          padding: 8,
          color: "#fff",
          textShadow: "0 2px 12px rgba(0,0,0,0.55)",
        }}
      >
        <SummaryRow stats={stats} light />
        <Divider light />
        <MiniChart daily={stats.daily} light />
        <Divider light />
        <TopCats topCategories={stats.topCategories} light />
        <AchievementRow items={stats.achievements} />
      </div>
    </>
  );
}

// ------------------------------------------------------------------
// Split: photo pinned to top half, stats card below
// ------------------------------------------------------------------
function SplitTemplate({ stats, photoUrl }: { stats: RecapStats; photoUrl?: string | null }) {
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 960, overflow: "hidden" }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            crossOrigin="anonymous"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background:
                "radial-gradient(120% 80% at 20% 10%, #ffd280 0%, transparent 60%), linear-gradient(160deg, #ffb44a, #ff7a1a)",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(20,10,0,0.45) 0%, rgba(20,10,0,0.05) 40%, transparent 100%)",
          }}
        />
        
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 900,
          bottom: 0,
          padding: "70px 60px 60px",
          background: "#fff7ea",
          borderTopLeftRadius: 48,
          borderTopRightRadius: 48,
          boxShadow: "0 -12px 40px rgba(0,0,0,0.15)",
        }}
      >
        <SummaryRow stats={stats} />
        <Divider />
        <MiniChart daily={stats.daily} />
        <Divider />
        <TopCats topCategories={stats.topCategories} />
        <AchievementRow items={stats.achievements} />
      </div>
    </>
  );
}

// ------------------------------------------------------------------
// Shared pieces
// ------------------------------------------------------------------
function Header({ light, label }: { light?: boolean; label: string }) {
  const color = light ? "#fff" : "#1a0f00";
  return (
    <div
      style={{
        position: "absolute",
        top: 48,
        left: 60,
        right: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 2,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "linear-gradient(135deg, #ffb44a, #ff7a1a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 30,
            boxShadow: "0 8px 20px rgba(255,120,20,0.4)",
          }}
        >
          💰
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: -0.3 }}>CashFlow</div>
          <div style={{ fontSize: 16, color: light ? "rgba(255,255,255,0.85)" : "#7a5a2a" }}>
            Recap
          </div>
        </div>
      </div>
      <div
        style={{
          padding: "10px 18px",
          borderRadius: 999,
          background: light ? "rgba(255,255,255,0.2)" : "rgba(255,180,74,0.2)",
          color,
          fontSize: 18,
          fontWeight: 600,
          backdropFilter: "blur(6px)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function SummaryRow({ stats, light }: { stats: RecapStats; light?: boolean }) {
  const savingsPct = Math.round(stats.savingRate * 100);
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "stretch" }}>
      <StatBlock label="Pemasukan" value={idr(stats.income)} accent={light ? "#7bf3a0" : "#16a34a"} size="sm" light={light} />
      <StatBlock label="Pengeluaran" value={idr(stats.expense)} accent={light ? "#ffb3a3" : "#e94929"} size="sm" light={light} />
      <StatBlock
        label="Saldo"
        value={idr(stats.balance)}
        accent={light ? "#ffffff" : stats.balance >= 0 ? "#ff7a1a" : "#e94929"}
        size="lg"
        light={light}
        badge={stats.income > 0 ? `${savingsPct >= 0 ? "+" : ""}${savingsPct}% saving` : undefined}
      />
    </div>
  );
}

function StatBlock({
  label,
  value,
  accent,
  size,
  badge,
  light,
}: {
  label: string;
  value: string;
  accent: string;
  size: "sm" | "lg";
  badge?: string;
  light?: boolean;
}) {
  return (
    <div style={{ flex: size === "lg" ? 1.3 : 1 }}>
      <div style={{ fontSize: 18, color: light ? "rgba(255,255,255,0.85)" : "#7a5a2a", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div
        style={{
          fontSize: size === "lg" ? 42 : 30,
          fontWeight: 800,
          color: accent,
          letterSpacing: -0.5,
          lineHeight: 1.05,
        }}
      >
        {value}
      </div>
      {badge && (
        <div
          style={{
            marginTop: 8,
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 700,
            background: light ? "rgba(255,255,255,0.2)" : "rgba(255,180,74,0.18)",
            color: light ? "#fff" : "#ff7a1a",
          }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}

function Divider({ light }: { light?: boolean } = {}) {
  return <div style={{ height: 1, background: light ? "rgba(255,255,255,0.25)" : "rgba(122,90,42,0.15)", margin: "28px 0" }} />;
}

function MiniChart({ daily, light }: { daily: RecapStats["daily"]; light?: boolean }) {
  const { path, area, points } = useMemo(() => buildPath(daily), [daily]);
  const stroke = light ? "#ffffff" : "#ff7a1a";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: light ? "#fff" : "#3a2705" }}>Arus Pengeluaran Harian</div>
        <div style={{ fontSize: 14, color: light ? "rgba(255,255,255,0.85)" : "#7a5a2a" }}>
          {daily.length} hari · {daily.filter((d) => d.expense > 0).length} hari aktif
        </div>
      </div>
      <svg viewBox="0 0 900 220" width="100%" height="180" preserveAspectRatio="none">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={light ? 0.35 : 0.5} />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#area)" />
        <path d={path} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.hasExpense ? 5 : 0} fill={stroke} />
        ))}
      </svg>
    </div>
  );
}

function buildPath(daily: RecapStats["daily"]) {
  const W = 900;
  const H = 220;
  const pad = 8;
  const max = Math.max(1, ...daily.map((d) => d.expense));
  const n = Math.max(daily.length, 1);
  const points = daily.map((d, i) => {
    const x = n === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (n - 1);
    const y = H - pad - ((d.expense / max) * (H - pad * 2));
    return { x, y, hasExpense: d.expense > 0 };
  });
  if (points.length === 0) return { path: "", area: "", points: [] };
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${points[points.length - 1].x.toFixed(1)},${H} L${points[0].x.toFixed(1)},${H} Z`;
  return { path, area, points };
}

function TopCats({ topCategories, light }: { topCategories: RecapStats["topCategories"]; light?: boolean }) {
  if (topCategories.length === 0) {
    return (
      <div style={{ fontSize: 16, color: light ? "rgba(255,255,255,0.85)" : "#7a5a2a" }}>Belum ada pengeluaran pada periode ini.</div>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: light ? "#fff" : "#3a2705", marginBottom: 14 }}>
        Top Kategori
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {topCategories.map((c) => (
          <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: light ? "rgba(255,255,255,0.18)" : "rgba(255,180,74,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
              }}
            >
              {c.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 600, color: light ? "#fff" : "#1a0f00" }}>{c.name}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: light ? "#fff" : "#ff7a1a" }}>{idr(c.amount)}</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: light ? "rgba(255,255,255,0.2)" : "rgba(122,90,42,0.12)" }}>
                <div
                  style={{
                    width: `${Math.max(4, Math.round(c.pct * 100))}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "linear-gradient(90deg, #ffb44a, #ff7a1a)",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AchievementRow({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 10 }}>
      {items.map((t, i) => (
        <div
          key={i}
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            background: "linear-gradient(135deg, #ffb44a, #ff7a1a)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            boxShadow: "0 6px 14px rgba(255,120,20,0.3)",
          }}
        >
          {t}
        </div>
      ))}
    </div>
  );
}
