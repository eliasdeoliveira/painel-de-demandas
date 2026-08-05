import { httpClient } from "@/shared/services/http-client";
import type { Page } from "@/shared/types/pagination";

import type {
  CreateDemandInput,
  Demand,
  DemandListFilters,
  DemandStatus,
  DemandStatusChange,
  DemandSummary,
} from "@/features/demands/types/demand";

const DEMANDS_PATH = "/demands";

/**
 * Remove filtros vazios antes de montar a query string.
 *
 * Um campo em branco significa "sem filtro"; enviá-lo faria o backend procurar
 * por uma string vazia.
 */
function toQueryParams(filters: DemandListFilters) {
  return {
    status: filters.status,
    requester: filters.requester.trim() || undefined,
    impact: filters.impact,
    search: filters.search.trim() || undefined,
    sort: filters.sort,
    order: filters.order,
    page: filters.page,
    limit: filters.limit,
  };
}

export async function fetchDemands(filters: DemandListFilters): Promise<Page<Demand>> {
  const { data } = await httpClient.get<Page<Demand>>(DEMANDS_PATH, {
    params: toQueryParams(filters),
  });
  return data;
}

export async function fetchDemandSummary(): Promise<DemandSummary> {
  const { data } = await httpClient.get<DemandSummary>(`${DEMANDS_PATH}/summary`);
  return data;
}

export async function fetchDemandStatusHistory(demandId: number): Promise<DemandStatusChange[]> {
  const { data } = await httpClient.get<DemandStatusChange[]>(
    `${DEMANDS_PATH}/${demandId}/status-history`,
  );
  return data;
}

export async function createDemand(input: CreateDemandInput): Promise<Demand> {
  const { data } = await httpClient.post<Demand>(DEMANDS_PATH, input);
  return data;
}

export async function updateDemandStatus(demandId: number, status: DemandStatus): Promise<Demand> {
  const { data } = await httpClient.patch<Demand>(`${DEMANDS_PATH}/${demandId}/status`, { status });
  return data;
}

export async function deleteDemand(demandId: number): Promise<void> {
  await httpClient.delete(`${DEMANDS_PATH}/${demandId}`);
}
