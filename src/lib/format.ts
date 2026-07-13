export const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export const shortDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const monthName = (m: number) =>
  new Date(2000, m, 1).toLocaleDateString("id-ID", { month: "short" });
