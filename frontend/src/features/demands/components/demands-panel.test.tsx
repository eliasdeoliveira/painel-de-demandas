import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as demandsApi from "@/features/demands/api/demands-api";
import { DemandsPanel } from "@/features/demands/components/demands-panel";
import type { Demand, DemandSummary } from "@/features/demands/types/demand";
import type { Page } from "@/shared/types/pagination";
import { buildDemand } from "@/test/demand-factory";
import { renderWithProviders } from "@/test/render-with-providers";

vi.mock("@/features/demands/api/demands-api");

const EMPTY_SUMMARY: DemandSummary = {
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  cancelled: 0,
};

function buildPage(items: Demand[]): Page<Demand> {
  return { items, page: 1, limit: 10, total: items.length, totalPages: items.length ? 1 : 0 };
}

/** Promessa que nunca resolve, para observar o estado otimista antes da resposta. */
function pending<TValue>(): Promise<TValue> {
  return new Promise<TValue>(() => {});
}

describe("DemandsPanel", () => {
  beforeEach(() => {
    vi.mocked(demandsApi.fetchDemandSummary).mockResolvedValue(EMPTY_SUMMARY);
    vi.mocked(demandsApi.fetchDemands).mockResolvedValue(buildPage([buildDemand()]));
  });

  it("exibe as demandas devolvidas pela API", async () => {
    renderWithProviders(<DemandsPanel />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Exportar relatório em CSV")).toBeInTheDocument();
    expect(within(table).getByText("Ana Souza")).toBeInTheDocument();
  });

  it("monta a mesma demanda em tabela e em cartão, para alternar por CSS", async () => {
    renderWithProviders(<DemandsPanel />);

    await screen.findByRole("table");
    // A tabela aparece a partir de `md`; o cartão, abaixo disso. As duas ficam
    // no HTML e a largura da tela decide qual é exibida.
    expect(screen.getAllByText("Exportar relatório em CSV")).toHaveLength(2);
    expect(screen.getByRole("listitem")).toHaveTextContent("Exportar relatório em CSV");
  });

  it("exibe o resumo vindo do servidor", async () => {
    vi.mocked(demandsApi.fetchDemandSummary).mockResolvedValue({
      total: 7,
      pending: 5,
      inProgress: 1,
      completed: 1,
      cancelled: 0,
    });

    renderWithProviders(<DemandsPanel />);

    expect((await screen.findByText("Total de demandas")).nextElementSibling).toHaveTextContent("7");
  });

  it("orienta o cadastro da primeira demanda quando não há nenhuma", async () => {
    vi.mocked(demandsApi.fetchDemands).mockResolvedValue(buildPage([]));

    renderWithProviders(<DemandsPanel />);

    expect(await screen.findByText("Nenhuma demanda cadastrada")).toBeInTheDocument();
  });

  it("diferencia lista vazia por filtro de lista sem nenhum cadastro", async () => {
    vi.mocked(demandsApi.fetchDemands).mockResolvedValue(buildPage([]));
    const user = userEvent.setup();

    renderWithProviders(<DemandsPanel />);
    await screen.findByText("Nenhuma demanda cadastrada");

    await user.type(screen.getByLabelText("Buscar por título"), "inexistente");

    expect(await screen.findByText("Nenhuma demanda encontrada")).toBeInTheDocument();
  });

  it("exibe o estado de erro quando a listagem falha", async () => {
    vi.mocked(demandsApi.fetchDemands).mockRejectedValue(new Error("falha de rede"));

    renderWithProviders(<DemandsPanel />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar as demandas",
    );
  });

  it("aplica a busca por título na consulta enviada à API", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DemandsPanel />);
    await screen.findByRole("table");

    await user.type(screen.getByLabelText("Buscar por título"), "csv");

    await waitFor(() => {
      expect(vi.mocked(demandsApi.fetchDemands)).toHaveBeenCalledWith(
        expect.objectContaining({ search: "csv", page: 1 }),
      );
    });
  });

  it("move a contagem do resumo antes da resposta do servidor", async () => {
    vi.mocked(demandsApi.fetchDemandSummary).mockResolvedValue({
      ...EMPTY_SUMMARY,
      total: 1,
      pending: 1,
    });
    vi.mocked(demandsApi.updateDemandStatus).mockReturnValue(pending<Demand>());
    const user = userEvent.setup();

    renderWithProviders(<DemandsPanel />);
    const table = await screen.findByRole("table");
    expect(screen.getByText("Pendentes").nextElementSibling).toHaveTextContent("1");

    await user.click(within(table).getByRole("combobox", { name: /Alterar status/ }));
    await user.click(await screen.findByRole("option", { name: "Em andamento" }));

    await waitFor(() => {
      expect(screen.getByText("Pendentes").nextElementSibling).toHaveTextContent("0");
    });
  });

  it("remove a linha da lista antes da resposta do servidor", async () => {
    vi.mocked(demandsApi.deleteDemand).mockReturnValue(pending<void>());
    const user = userEvent.setup();

    renderWithProviders(<DemandsPanel />);
    const table = await screen.findByRole("table");

    await user.click(
      within(table).getByRole("button", { name: /Remover demanda/ }),
    );
    await user.click(await screen.findByRole("button", { name: "Remover" }));

    await waitFor(() => {
      expect(screen.queryByText("Exportar relatório em CSV")).not.toBeInTheDocument();
    });
  });
});
