import type { DemandListFilters, DemandSortField, DemandStatus } from "@/features/demands/types/demand";

/**
 * Rótulos em português para os códigos de status usados pela API.
 *
 * A tradução vive só aqui: o backend não conhece o idioma da interface.
 */
export const DEMAND_STATUS_LABELS: Record<DemandStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const DEMAND_SORT_FIELD_LABELS: Record<DemandSortField, string> = {
  priority: "Prioridade",
  createdAt: "Data de criação",
  impact: "Impacto",
  urgency: "Urgência",
  title: "Título",
  status: "Status",
};

/** Níveis aceitos para impacto e urgência, iguais aos validados pelo backend. */
export const LEVEL_OPTIONS = [1, 2, 3, 4, 5] as const;

export const DEFAULT_PAGE_SIZE = 10;

/** Estado inicial dos filtros: a listagem começa ordenada por prioridade. */
export const DEFAULT_DEMAND_FILTERS: DemandListFilters = {
  status: undefined,
  requester: "",
  impact: undefined,
  search: "",
  sort: "priority",
  order: "desc",
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
};
