import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as demandsApi from "@/features/demands/api/demands-api";
import { DemandHistoryDialog } from "@/features/demands/components/demand-history-dialog";
import { buildDemand } from "@/test/demand-factory";
import { renderWithProviders } from "@/test/render-with-providers";

vi.mock("@/features/demands/api/demands-api");

const DEMAND = buildDemand({ id: 7, title: "Exportar relatório em CSV" });
const OPEN_BUTTON_NAME = "Ver histórico da demanda Exportar relatório em CSV";

const HISTORY = [
  { id: 1, fromStatus: null, toStatus: "pending" as const, changedAt: "2026-03-10T12:00:00Z" },
  {
    id: 2,
    fromStatus: "pending" as const,
    toStatus: "in_progress" as const,
    changedAt: "2026-03-11T09:30:00Z",
  },
];

describe("DemandHistoryDialog", () => {
  beforeEach(() => {
    vi.mocked(demandsApi.fetchDemandStatusHistory).mockResolvedValue(HISTORY);
  });

  it("não consulta o histórico enquanto o diálogo está fechado", () => {
    renderWithProviders(<DemandHistoryDialog demand={DEMAND} />);

    expect(demandsApi.fetchDemandStatusHistory).not.toHaveBeenCalled();
  });

  it("busca o histórico da demanda ao abrir", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DemandHistoryDialog demand={DEMAND} />);

    await user.click(screen.getByRole("button", { name: OPEN_BUTTON_NAME }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(demandsApi.fetchDemandStatusHistory).toHaveBeenCalledWith(7);
  });

  it("descreve o cadastro e cada transição na linha do tempo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DemandHistoryDialog demand={DEMAND} />);

    await user.click(screen.getByRole("button", { name: OPEN_BUTTON_NAME }));

    const events = await screen.findAllByRole("listitem");
    expect(events).toHaveLength(2);
    expect(events[0]).toHaveTextContent("Demanda cadastrada como");
    expect(events[0]).toHaveTextContent("Pendente");
    expect(events[1]).toHaveTextContent("Pendente");
    expect(events[1]).toHaveTextContent("Em andamento");
  });

  it("exibe o estado de erro quando a consulta falha", async () => {
    vi.mocked(demandsApi.fetchDemandStatusHistory).mockRejectedValue(new Error("falha"));
    const user = userEvent.setup();
    renderWithProviders(<DemandHistoryDialog demand={DEMAND} />);

    await user.click(screen.getByRole("button", { name: OPEN_BUTTON_NAME }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o histórico",
    );
  });
});
