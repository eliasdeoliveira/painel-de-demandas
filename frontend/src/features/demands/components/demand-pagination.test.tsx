import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DemandPagination } from "@/features/demands/components/demand-pagination";
import type { Demand } from "@/features/demands/types/demand";
import type { Page } from "@/shared/types/pagination";
import { buildDemand } from "@/test/demand-factory";

function buildPage(overrides: Partial<Page<Demand>> = {}): Page<Demand> {
  return {
    items: [buildDemand()],
    page: 2,
    limit: 10,
    total: 25,
    totalPages: 3,
    ...overrides,
  };
}

describe("DemandPagination", () => {
  it("informa quais itens estão sendo exibidos", () => {
    render(<DemandPagination page={buildPage()} onPageChange={vi.fn()} />);

    expect(screen.getByText(/Exibindo 11–11 de 25 demandas/)).toBeInTheDocument();
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
  });

  it("desabilita a navegação para trás na primeira página", () => {
    render(<DemandPagination page={buildPage({ page: 1 })} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeEnabled();
  });

  it("desabilita a navegação para frente na última página", () => {
    render(<DemandPagination page={buildPage({ page: 3 })} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });

  it("pede a próxima página ao componente pai", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<DemandPagination page={buildPage()} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: "Próxima" }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
