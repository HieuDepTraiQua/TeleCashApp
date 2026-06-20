import { initData } from "./telegram";

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `tma ${initData}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(e.error ?? res.statusText);
  }
  return res.json();
}

export const apiClient = {
  daySummary: (date: string) => req(`/day-summary?date=${date}`),
  transactions: (date: string) => req(`/transactions?date=${date}`),
  categories: () => req(`/categories`),
  categoriesFull: () => req(`/categories-full`),
  report: (qs: string) => req(`/reports?${qs}`),
  search: (qs: string) => req(`/search?${qs}`),
  me: () => req(`/me`),
  exportCsv: (qs: string) => req(`/export/csv?${qs}`, { method: "POST" }),
  create: (body: unknown) => req(`/transactions`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: unknown) => req(`/transactions/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: string) => req(`/transactions/${id}`, { method: "DELETE" }),
  addCategory: (body: unknown) => req(`/categories`, { method: "POST", body: JSON.stringify(body) }),
  addKeyword: (categoryId: string, text: string) =>
    req(`/categories/${categoryId}/keywords`, { method: "POST", body: JSON.stringify({ text }) }),
  deleteKeyword: (id: string) => req(`/keywords/${id}`, { method: "DELETE" }),
};
