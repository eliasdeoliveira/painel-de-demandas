import { describe, expect, it } from "vitest";

import { findLastValidPage, isPageOutOfRange } from "@/features/demands/utils/page-recovery";
import type { Page } from "@/shared/types/pagination";

function buildPage(overrides: Partial<Page<string>> = {}): Page<string> {
  return { items: ["demanda"], page: 1, limit: 10, total: 1, totalPages: 1, ...overrides };
}

describe("isPageOutOfRange", () => {
  it("reconhece a página que ficou sem conteúdo após o total encolher", () => {
    expect(isPageOutOfRange(buildPage({ items: [], page: 2, total: 10, totalPages: 1 }))).toBe(true);
  });

  it("não considera a primeira página fora de faixa, mesmo vazia", () => {
    // Lista realmente vazia: quem deve aparecer é o estado vazio, não uma
    // navegação para outra página.
    expect(isPageOutOfRange(buildPage({ items: [], page: 1, total: 0, totalPages: 0 }))).toBe(false);
  });

  it("não considera fora de faixa uma página com resultados", () => {
    expect(isPageOutOfRange(buildPage({ page: 3, totalPages: 5 }))).toBe(false);
  });
});

describe("findLastValidPage", () => {
  it("aponta para a última página que ainda tem conteúdo", () => {
    expect(findLastValidPage(buildPage({ totalPages: 4 }))).toBe(4);
  });

  it("aponta para a primeira página quando não há nenhum resultado", () => {
    expect(findLastValidPage(buildPage({ items: [], total: 0, totalPages: 0 }))).toBe(1);
  });
});
