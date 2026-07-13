import type { Transaction } from "./mock-data";
import { idr, shortDate } from "./format";

// ---------- Download helper ----------
function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
};

// ---------- JSON ----------
export function exportJSON(transactions: Transaction[]) {
  const payload = {
    app: "catatan-keuangan",
    version: 1,
    exportedAt: new Date().toISOString(),
    count: transactions.length,
    transactions,
  };
  download(
    `backup-keuangan-${stamp()}.json`,
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
  );
}

export async function parseJSONFile(file: File): Promise<Transaction[]> {
  const text = await file.text();
  const data = JSON.parse(text);
  const items: unknown = Array.isArray(data) ? data : data?.transactions;
  if (!Array.isArray(items)) throw new Error("Format JSON tidak valid");
  return items.map((r) => normalize(r as Record<string, unknown>));
}

// ---------- CSV ----------
const CSV_HEADERS = ["id", "date", "type", "category", "amount", "note", "icon"] as const;

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCSV(transactions: Transaction[]) {
  const rows = [CSV_HEADERS.join(",")];
  for (const t of transactions) {
    rows.push(CSV_HEADERS.map((h) => csvEscape((t as Record<string, unknown>)[h])).join(","));
  }
  download(
    `riwayat-keuangan-${stamp()}.csv`,
    new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv;charset=utf-8" }),
  );
}

export async function parseCSVFile(file: File): Promise<Transaction[]> {
  const text = (await file.text()).replace(/^\ufeff/, "");
  const lines = parseCSV(text);
  if (lines.length < 2) return [];
  const header = lines[0].map((h) => h.trim());
  return lines.slice(1).filter((r) => r.length > 1 || (r[0] && r[0].trim())).map((row) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => (obj[h] = row[i] ?? ""));
    return normalize(obj);
  });
}

function parseCSV(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); out.push(row); row = []; cell = "";
      } else cell += c;
    }
  }
  if (cell.length || row.length) { row.push(cell); out.push(row); }
  return out;
}

function normalize(r: Record<string, unknown>): Transaction {
  const type = String(r.type ?? "expense") as Transaction["type"];
  const amount = Number(r.amount ?? 0) || 0;
  const date = r.date ? new Date(String(r.date)).toISOString() : new Date().toISOString();
  const id = r.id
    ? String(r.id)
    : typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    type: type === "income" ? "income" : "expense",
    amount,
    category: String(r.category ?? "Lainnya"),
    icon: String(r.icon ?? (type === "income" ? "✨" : "🧩")),
    note: String(r.note ?? ""),
    date,
  };
}

// ---------- PDF ----------
export async function exportPDF(
  transactions: Transaction[],
  meta?: { title?: string; subtitle?: string },
) {
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as { default: (doc: unknown, opts: unknown) => void }).default;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  // Header
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(meta?.title ?? "Laporan Keuangan", 40, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(meta?.subtitle ?? `Dicetak ${shortDate(new Date())}`, 40, 52);

  // Summary
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  const boxY = 90;
  const boxes: [string, string, [number, number, number]][] = [
    ["Pemasukan", idr(income), [22, 163, 74]],
    ["Pengeluaran", idr(expense), [220, 38, 38]],
    ["Saldo", idr(balance), [37, 99, 235]],
  ];
  const bw = (pageW - 80 - 20) / 3;
  boxes.forEach(([label, val, color], i) => {
    const x = 40 + i * (bw + 10);
    doc.setDrawColor(230);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(x, boxY, bw, 56, 6, 6, "FD");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(label, x + 12, boxY + 20);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(val, x + 12, boxY + 42);
    doc.setFont("helvetica", "normal");
  });

  // Table
  const rows = transactions
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((t) => [
      shortDate(t.date),
      t.type === "income" ? "Masuk" : "Keluar",
      t.category,
      t.note || "-",
      `${t.type === "income" ? "+" : "-"}${idr(t.amount)}`,
    ]);

  autoTable(doc, {
    startY: 170,
    head: [["Tanggal", "Jenis", "Kategori", "Catatan", "Nominal"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [249, 115, 22], textColor: 255 },
    alternateRowStyles: { fillColor: [252, 246, 240] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 55 },
      4: { halign: "right", cellWidth: 100 },
    },
    didDrawPage: () => {
      const pageH = doc.internal.pageSize.getHeight();
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Halaman ${page}`, pageW - 40, pageH - 20, { align: "right" });
      doc.text("Catatan Keuangan", 40, pageH - 20);
    },
  });

  doc.save(`riwayat-keuangan-${stamp()}.pdf`);
}
