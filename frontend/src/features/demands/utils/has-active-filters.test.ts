import { describe, expect, it } from "vitest";

import { DEFAULT_DEMAND_FILTERS } from "@/features/demands/constants/demand-options";
import { hasActiveFilters } from "@/features/demands/utils/has-active-filters";

describe("hasActiveFilters", () => {
  it("considera os filtros padrão como listagem sem restrição", () => {
    expect(hasActiveFilters(DEFAULT_DEMAND_FILTERS)).toBe(false);
  });

  it("ignora um campo de texto preenchido só com espaços", () => {
    expect(hasActiveFilters({ ...DEFAULT_DEMAND_FILTERS, search: "   " })).toBe(false);
  });

  it("não considera ordenação e paginação como filtro", () => {
    expect(
      hasActiveFilters({ ...DEFAULT_DEMAND_FILTERS, sort: "title", order: "asc", page: 3 }),
    ).toBe(false);
  });

  it.each([
    ["status", { status: "completed" as const }],
    ["impacto", { impact: 5 }],
    ["busca por título", { search: "csv" }],
    ["solicitante", { requester: "Ana" }],
  ])("reconhece o filtro de %s", (_label, changes) => {
    expect(hasActiveFilters({ ...DEFAULT_DEMAND_FILTERS, ...changes })).toBe(true);
  });
});
