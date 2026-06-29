import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./lib/api";
import type { Category, CategoryWithKeywords, DaySummary, Me, ReportData, Tx } from "./types";

export function useDaySummary(date: string) {
  return useQuery<DaySummary>({ queryKey: ["day-summary", date], queryFn: () => apiClient.daySummary(date) });
}

export function useTransactions(date: string) {
  return useQuery<{ transactions: Tx[] }>({
    queryKey: ["transactions", date],
    queryFn: () => apiClient.transactions(date),
  });
}

export function useCategories() {
  return useQuery<{ categories: Category[] }>({ queryKey: ["categories"], queryFn: () => apiClient.categories() });
}

export function useCategoriesFull() {
  return useQuery<{ categories: CategoryWithKeywords[] }>({
    queryKey: ["categories-full"],
    queryFn: () => apiClient.categoriesFull(),
  });
}

export function useMe() {
  return useQuery<{ user: Me | null }>({ queryKey: ["me"], queryFn: () => apiClient.me() });
}

export function useReport(kind: string, ref: string, from: string, to: string) {
  const qs = new URLSearchParams({ range: kind });
  if (kind === "custom") {
    qs.set("from", from);
    qs.set("to", to);
  } else {
    qs.set("ref", ref);
  }
  return useQuery<ReportData>({
    queryKey: ["report", kind, ref, from, to],
    queryFn: () => apiClient.report(qs.toString()),
  });
}

export function useSearch(qs: string, enabled: boolean) {
  return useQuery<{ transactions: Tx[] }>({
    queryKey: ["search", qs],
    queryFn: () => apiClient.search(qs),
    enabled,
  });
}

export function useTxMutations(date: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["transactions", date] });
    qc.invalidateQueries({ queryKey: ["day-summary", date] });
    qc.invalidateQueries({ queryKey: ["report"] });
    qc.invalidateQueries({ queryKey: ["categories-full"] });
  };
  return {
    create: useMutation({ mutationFn: (body: unknown) => apiClient.create(body), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: (v: { id: string; body: unknown }) => apiClient.update(v.id, v.body),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => apiClient.remove(id), onSuccess: invalidate }),
  };
}

export function useKeywordMutations() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ["categories-full"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };
  return {
    addCategory: useMutation({
      mutationFn: (b: { name: string; type: string; icon?: string }) => apiClient.addCategory(b),
      onSuccess: inv,
    }),
    addKeyword: useMutation({
      mutationFn: (v: { categoryId: string; text: string }) => apiClient.addKeyword(v.categoryId, v.text),
      onSuccess: inv,
    }),
    deleteKeyword: useMutation({ mutationFn: (id: string) => apiClient.deleteKeyword(id), onSuccess: inv }),
  };
}
