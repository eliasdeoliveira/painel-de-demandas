/** Contrato da API de demandas, espelhado a partir do backend. */

export const DEMAND_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export type DemandStatus = (typeof DEMAND_STATUSES)[number];

export const DEMAND_SORT_FIELDS = [
  "priority",
  "createdAt",
  "impact",
  "urgency",
  "title",
  "status",
] as const;
export type DemandSortField = (typeof DEMAND_SORT_FIELDS)[number];

export type SortOrder = "asc" | "desc";

export interface Demand {
  id: number;
  title: string;
  description: string;
  requester: string;
  impact: number;
  urgency: number;
  status: DemandStatus;
  /** Calculado no servidor: (impacto × 2) + urgência. */
  priorityScore: number;
  createdAt: string;
  updatedAt: string;
}

/** Um evento da linha do tempo da demanda. */
export interface DemandStatusChange {
  id: number;
  /** Nulo no evento de cadastro, que não parte de nenhum status anterior. */
  fromStatus: DemandStatus | null;
  toStatus: DemandStatus;
  changedAt: string;
}

export interface DemandSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface DemandListFilters {
  status?: DemandStatus;
  requester: string;
  impact?: number;
  search: string;
  sort: DemandSortField;
  order: SortOrder;
  page: number;
  limit: number;
}

export interface CreateDemandInput {
  title: string;
  description: string;
  requester: string;
  impact: number;
  urgency: number;
}
