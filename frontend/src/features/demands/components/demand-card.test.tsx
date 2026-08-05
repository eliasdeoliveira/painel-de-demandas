import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DemandCard } from "@/features/demands/components/demand-card";
import { buildDemand } from "@/test/demand-factory";
import { renderWithProviders } from "@/test/render-with-providers";

function renderCard(overrides: Partial<Parameters<typeof DemandCard>[0]> = {}) {
  const onStatusChange = vi.fn();
  const onDelete = vi.fn();

  renderWithProviders(
    <ul>
      <DemandCard
        demand={buildDemand()}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        isBusy={false}
        {...overrides}
      />
    </ul>,
  );

  return { onStatusChange, onDelete, user: userEvent.setup() };
}

describe("DemandCard", () => {
  it("exibe no celular os mesmos campos exigidos na tabela", () => {
    renderCard();
    const card = screen.getByRole("listitem");

    expect(card).toHaveTextContent("Exportar relatório em CSV");
    expect(card).toHaveTextContent("Ana Souza");
    expect(card).toHaveTextContent("Impacto");
    expect(card).toHaveTextContent("5");
    expect(card).toHaveTextContent("Urgência");
    expect(card).toHaveTextContent("3");
    expect(card).toHaveTextContent("13");
    expect(card).toHaveTextContent("Pendente");
    expect(card).toHaveTextContent("Criada em 10/03/2026");
  });

  it("permite trocar o status sem sair da tela", async () => {
    const { onStatusChange, user } = renderCard();

    await user.click(
      screen.getByRole("combobox", { name: "Alterar status da demanda Exportar relatório em CSV" }),
    );
    await user.click(await screen.findByRole("option", { name: "Em andamento" }));

    expect(onStatusChange).toHaveBeenCalledWith("in_progress");
  });

  it("bloqueia as ações enquanto uma alteração está em andamento", () => {
    renderCard({ isBusy: true });

    expect(
      screen.getByRole("combobox", { name: "Alterar status da demanda Exportar relatório em CSV" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Remover demanda Exportar relatório em CSV" }),
    ).toBeDisabled();
  });
});
