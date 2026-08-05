import type { DemandListFilters } from "@/features/demands/types/demand";

/**
 * Chaves de cache do TanStack Query.
 *
 * Centralizá-las evita strings soltas e permite invalidar toda a feature de uma
 * vez com `demandKeys.all`.
 */
export const demandKeys = {
  all: ["demands"] as const,
  lists: () => [...demandKeys.all, "list"] as const,
  list: (filters: DemandListFilters) => [...demandKeys.lists(), filters] as const,
  summary: () => [...demandKeys.all, "summary"] as const,
  // Fica sob `all` de propósito: invalidar a feature após uma troca de status
  // também derruba o histórico em cache, que acabou de mudar.
  statusHistory: (demandId: number) => [...demandKeys.all, "status-history", demandId] as const,
};
