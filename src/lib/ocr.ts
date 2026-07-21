// Receipt OCR helper using tesseract.js (lazy-loaded).
// Runs fully on-device; no network calls needed after model download (cached by SW).

export type OcrProgress = {
  status: string;
  progress: number; // 0..1
};

export type ParsedReceipt = {
  merchant: string;
  total: number;
  date: string; // yyyy-mm-dd
  rawText: string;
};

let workerPromise: Promise<import("tesseract.js").Worker> | null = null;

async function getWorker(onProgress?: (p: OcrProgress) => void) {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(["ind", "eng"], 1, {
        logger: (m) => {
          if (onProgress && typeof m.progress === "number") {
            onProgress({ status: m.status, progress: m.progress });
          }
        },
      });
      return worker;
    })();
  }
  return workerPromise;
}

export async function scanReceipt(
  file: File | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<ParsedReceipt> {
  onProgress?.({ status: "memuat model OCR", progress: 0.02 });
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(file);
  return parseReceiptText(data.text);
}

// -------- Parser --------

const IDN_MONTHS: Record<string, number> = {
  jan: 0, januari: 0,
  feb: 1, februari: 1,
  mar: 2, maret: 2,
  apr: 3, april: 3,
  mei: 4, may: 4,
  jun: 5, juni: 5,
  jul: 6, juli: 6,
  agu: 7, agt: 7, agustus: 7, aug: 7,
  sep: 8, september: 8,
  okt: 9, oct: 9, oktober: 9,
  nov: 10, november: 10,
  des: 11, dec: 11, desember: 11,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseNumberID(raw: string): number {
  // Handles "12.500", "12,500", "12.500,00", "12,500.00", "Rp 12.500"
  const s = raw.replace(/[^\d.,]/g, "");
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized = s;
  if (lastComma > lastDot) {
    // comma is decimal separator (id-ID)
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    // dot is decimal separator, but only if it's followed by exactly 2 digits
    if (/\.\d{1,2}$/.test(s)) {
      normalized = s.replace(/,/g, "");
    } else {
      normalized = s.replace(/[.,]/g, "");
    }
  } else {
    normalized = s.replace(/[.,]/g, "");
  }
  const n = Number(normalized);
  if (!isFinite(n)) return 0;
  return Math.round(n);
}

function extractDate(text: string): string {
  const today = toISODate(new Date());

  // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  const m1 = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (m1) {
    const dd = Number(m1[1]);
    const mm = Number(m1[2]);
    let yy = Number(m1[3]);
    if (yy < 100) yy += 2000;
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yy >= 2000 && yy <= 2100) {
      return `${yy}-${pad(mm)}-${pad(dd)}`;
    }
  }

  // yyyy-mm-dd
  const m2 = text.match(/\b(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/);
  if (m2) {
    const yy = Number(m2[1]);
    const mm = Number(m2[2]);
    const dd = Number(m2[3]);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      return `${yy}-${pad(mm)}-${pad(dd)}`;
    }
  }

  // dd MMM yyyy — e.g. "12 Jan 2025" / "12 Januari 2025"
  const m3 = text.match(/\b(\d{1,2})\s+([A-Za-zÀ-ÿ]{3,10})\s+(20\d{2})\b/);
  if (m3) {
    const dd = Number(m3[1]);
    const mm = IDN_MONTHS[m3[2].toLowerCase()];
    const yy = Number(m3[3]);
    if (mm !== undefined && dd >= 1 && dd <= 31) {
      return `${yy}-${pad(mm + 1)}-${pad(dd)}`;
    }
  }

  return today;
}

function extractTotal(lines: string[]): number {
  // Prefer lines containing a "total" keyword; skip "subtotal".
  const totalKeywords = /\b(grand\s*total|total\s*bayar|total\s*belanja|total\s*akhir|total|jumlah|bayar|dibayar|tunai)\b/i;
  const skipKeywords = /\b(sub\s*total|subtotal|kembalian|kembali|change|discount|diskon|ppn|pajak|tax|hemat|point|poin)\b/i;

  const candidates: number[] = [];
  for (const line of lines) {
    if (skipKeywords.test(line)) continue;
    if (!totalKeywords.test(line)) continue;
    const nums = line.match(/[\d.,]{3,}/g);
    if (!nums) continue;
    for (const n of nums) {
      const v = parseNumberID(n);
      if (v >= 500) candidates.push(v);
    }
  }
  if (candidates.length) return Math.max(...candidates);

  // Fallback: pick the largest number found anywhere.
  const all: number[] = [];
  for (const line of lines) {
    if (skipKeywords.test(line)) continue;
    const nums = line.match(/[\d.,]{3,}/g);
    if (!nums) continue;
    for (const n of nums) {
      const v = parseNumberID(n);
      if (v >= 1000 && v < 100_000_000) all.push(v);
    }
  }
  return all.length ? Math.max(...all) : 0;
}

function extractMerchant(lines: string[]): string {
  const skip = /^(struk|nota|invoice|receipt|kwitansi|jl\.|jalan|no\.?\s?\d|telp|tel\.|phone|npwp|kasir|cashier)/i;
  for (const raw of lines.slice(0, 6)) {
    const line = raw.trim();
    if (line.length < 3) continue;
    if (skip.test(line)) continue;
    if (/^[\d.,\s\-\/:]+$/.test(line)) continue; // pure numbers/symbols
    // Prefer lines with letters
    if (/[A-Za-z]{3,}/.test(line)) {
      return line.replace(/\s{2,}/g, " ").slice(0, 40);
    }
  }
  return "Struk Belanja";
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    merchant: extractMerchant(lines),
    total: extractTotal(lines),
    date: extractDate(text),
    rawText: text,
  };
}
