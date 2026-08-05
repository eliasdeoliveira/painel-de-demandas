import type { DemandStatus, DemandSummary } from "@/features/demands/types/demand";

/** O resumo expõe os contadores em camelCase; o domínio usa os códigos da API. */
const SUMMARY_KEY_BY_STATUS: Record<DemandStatus, keyof DemandSummary> = {
  pending: "pending",
  in_progress: "inProgress",
  completed: "completed",
  cancelled: "cancelled",
};

/**
 * Reflete uma troca de status no resumo, sem esperar o servidor.
 *
 * O total não muda: a demanda apenas migra de um contador para outro.
 */
export function applyStatusChangeToSummary(
  summary: DemandSummary,
  fromStatus: DemandStatus,
  toStatus: DemandStatus,
): DemandSummary {
  if (fromStatus === toStatus) {
    return summary;
  }

  const fromKey = SUMMARY_KEY_BY_STATUS[fromStatus];
  const toKey = SUMMARY_KEY_BY_STATUS[toStatus];

  return {
    ...summary,
    [fromKey]: Math.max(0, summary[fromKey] - 1),
    [toKey]: summary[toKey] + 1,
  };
}

/** Reflete a remoção de uma demanda no resumo. */
export function applyRemovalToSummary(
  summary: DemandSummary,
  status: DemandStatus,
): DemandSummary {
  const statusKey = SUMMARY_KEY_BY_STATUS[status];

  return {
    ...summary,
    total: Math.max(0, summary.total - 1),
    [statusKey]: Math.max(0, summary[statusKey] - 1),
  };
}
