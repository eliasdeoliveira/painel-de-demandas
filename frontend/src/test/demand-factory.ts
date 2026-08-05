import type { Demand } from "@/features/demands/types/demand";

const DEFAULT_DEMAND: Demand = {
  id: 1,
  title: "Exportar relatório em CSV",
  description: "O time comercial precisa exportar a listagem já filtrada.",
  requester: "Ana Souza",
  impact: 5,
  urgency: 3,
  status: "pending",
  priorityScore: 13,
  createdAt: "2026-03-10T12:00:00Z",
  updatedAt: "2026-03-10T12:00:00Z",
};

/** Demanda de exemplo para os testes, com os campos que cada caso precisar ajustar. */
export function buildDemand(overrides: Partial<Demand> = {}): Demand {
  return { ...DEFAULT_DEMAND, ...overrides };
}
