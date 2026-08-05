import type { DemandListFilters } from "@/features/demands/types/demand";

/**
 * Indica se o usuário restringiu a listagem de alguma forma.
 *
 * Serve para diferenciar "ainda não há demandas" de "nenhuma demanda atende ao
 * que você procurou", que pedem mensagens diferentes.
 */
export function hasActiveFilters(filters: DemandListFilters): boolean {
  return Boolean(
    filters.status || filters.impact || filters.search.trim() || filters.requester.trim(),
  );
}
