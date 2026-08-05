import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DemandTable } from "@/features/demands/components/demand-table";
import { buildDemand } from "@/test/demand-factory";
import { renderWithProviders } from "@/test/render-with-providers";

// A tabela contém o diálogo de histórico, que consulta a API pelo TanStack
// Query — daí a necessidade dos providers.
function renderTable(overrides: Partial<Parameters<typeof DemandTable>[0]> = {}) {
  const onStatusChange = vi.fn();
  const onDelete = vi.fn();

  renderWithProviders(
    <DemandTable
      demands={[buildDemand()]}
      onStatusChange={onStatusChange}
      onDelete={onDelete}
      isBusy={false}
      {...overrides}
    />,
  );

  return { onStatusChange, onDelete, user: userEvent.setup() };
}

describe("DemandTable", () => {
  it("exibe todos os dados exigidos de cada demanda", () => {
    renderTable();
    const row = screen.getAllByRole("row")[1];

    expect(within(row).getByText("Exportar relatório em CSV")).toBeInTheDocument();
    expect(within(row).getByText("Ana Souza")).toBeInTheDocument();
    expect(within(row).getByText("5")).toBeInTheDocument();
    expect(within(row).getByText("3")).toBeInTheDocument();
    expect(within(row).getByText("13")).toBeInTheDocument();
    expect(within(row).getByText("Pendente")).toBeInTheDocument();
    expect(within(row).getByText("10/03/2026")).toBeInTheDocument();
  });

  it("ordena as demandas exatamente na ordem recebida do servidor", () => {
    renderTable({
      demands: [
        buildDemand({ id: 1, title: "Prioridade alta", priorityScore: 13 }),
        buildDemand({ id: 2, title: "Prioridade baixa", priorityScore: 4 }),
      ],
    });

    const titles = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[0].textContent);

    expect(titles[0]).toContain("Prioridade alta");
    expect(titles[1]).toContain("Prioridade baixa");
  });

  it("entrega a demanda inteira ao trocar o status, para permitir o otimismo", async () => {
    const demand = buildDemand();
    const { onStatusChange, user } = renderTable({ demands: [demand] });

    await user.click(
      screen.getByRole("combobox", { name: "Alterar status da demanda Exportar relatório em CSV" }),
    );
    await user.click(await screen.findByRole("option", { name: "Concluída" }));

    expect(onStatusChange).toHaveBeenCalledWith(demand, "completed");
  });

  it("só remove a demanda depois da confirmação", async () => {
    const demand = buildDemand();
    const { onDelete, user } = renderTable({ demands: [demand] });

    await user.click(
      screen.getByRole("button", { name: "Remover demanda Exportar relatório em CSV" }),
    );
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: "Remover" }));

    expect(onDelete).toHaveBeenCalledWith(demand);
  });

  it("bloqueia as ações enquanto uma alteração está em andamento", () => {
    renderTable({ isBusy: true });

    expect(
      screen.getByRole("combobox", { name: "Alterar status da demanda Exportar relatório em CSV" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Remover demanda Exportar relatório em CSV" }),
    ).toBeDisabled();
  });
});
