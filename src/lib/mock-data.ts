export type TxType = "income" | "expense";

export type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  icon: string;
  note: string;
  date: string; // ISO
};

const cats = {
  income: [
    { name: "Gaji", icon: "💼" },
    { name: "Bonus", icon: "🎁" },
    { name: "Freelance", icon: "💻" },
  ],
  expense: [
    { name: "Makan", icon: "🍜" },
    { name: "Transport", icon: "🚕" },
    { name: "Belanja", icon: "🛍️" },
    { name: "Tagihan", icon: "🧾" },
    { name: "Hiburan", icon: "🎬" },
    { name: "Kesehatan", icon: "💊" },
  ],
};

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateMockTransactions(): Transaction[] {
  const rand = seedRandom(42);
  const txs: Transaction[] = [];
  const now = new Date();
  for (let i = 0; i < 45; i++) {
    const daysAgo = Math.floor(rand() * 75);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const isIncome = rand() < 0.25;
    const pool = isIncome ? cats.income : cats.expense;
    const c = pool[Math.floor(rand() * pool.length)];
    const amount = isIncome
      ? Math.floor(rand() * 5000000) + 1000000
      : Math.floor(rand() * 300000) + 15000;
    txs.push({
      id: `tx-${i}`,
      type: isIncome ? "income" : "expense",
      amount,
      category: c.name,
      icon: c.icon,
      note: isIncome ? `Pemasukan ${c.name}` : `${c.name} harian`,
      date: date.toISOString(),
    });
  }
  return txs.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const MOCK_TXS = generateMockTransactions();
