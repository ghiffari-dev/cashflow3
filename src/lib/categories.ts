export type CategoryDef = { name: string; icon: string };
export type TxKind = "income" | "expense";

export const DEFAULT_CATEGORIES: Record<TxKind, CategoryDef[]> = {
  income: [
    { name: "Gaji", icon: "💼" },
    { name: "Bonus", icon: "🎁" },
    { name: "Freelance", icon: "💻" },
    { name: "Investasi", icon: "📈" },
    { name: "Hadiah", icon: "🎉" },
    { name: "Lainnya", icon: "✨" },
  ],
  expense: [
    { name: "Makan", icon: "🍜" },
    { name: "Transport", icon: "🚕" },
    { name: "Belanja", icon: "🛍️" },
    { name: "Tagihan", icon: "🧾" },
    { name: "Hiburan", icon: "🎬" },
    { name: "Kesehatan", icon: "💊" },
    { name: "Pendidikan", icon: "📚" },
    { name: "Lainnya", icon: "🧩" },
  ],
};

// Kept for backward compatibility with other imports.
export const CATEGORIES = DEFAULT_CATEGORIES;

export type CustomCategoryMap = { income: CategoryDef[]; expense: CategoryDef[] };

export function mergeCategories(
  custom: CustomCategoryMap | null,
): Record<TxKind, CategoryDef[]> {
  if (!custom) return DEFAULT_CATEGORIES;
  return {
    income: dedupe([...DEFAULT_CATEGORIES.income, ...(custom.income ?? [])]),
    expense: dedupe([...DEFAULT_CATEGORIES.expense, ...(custom.expense ?? [])]),
  };
}

function dedupe(arr: CategoryDef[]): CategoryDef[] {
  const seen = new Set<string>();
  const out: CategoryDef[] = [];
  for (const c of arr) {
    const key = c.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name: c.name.trim(), icon: c.icon || "🧩" });
  }
  return out;
}

export function iconFor(type: TxKind, name: string, custom?: CustomCategoryMap | null): string {
  const all = mergeCategories(custom ?? null);
  return all[type].find((c) => c.name === name)?.icon ?? (type === "income" ? "✨" : "🧩");
}

export function isDefault(type: TxKind, name: string): boolean {
  return DEFAULT_CATEGORIES[type].some((c) => c.name === name);
}
