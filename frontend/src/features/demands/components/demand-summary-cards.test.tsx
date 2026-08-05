import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DemandSummaryCards } from "@/features/demands/components/demand-summary-cards";

const SUMMARY = { total: 9, pending: 4, inProgress: 3, completed: 1, cancelled: 1 };

describe("DemandSummaryCards", () => {
  it("exibe a contagem de cada status", () => {
    render(<DemandSummaryCards summary={SUMMARY} isLoading={false} />);

    expect(screen.getByText("Total de demandas").nextElementSibling).toHaveTextContent("9");
    expect(screen.getByText("Pendentes").nextElementSibling).toHaveTextContent("4");
    expect(screen.getByText("Em andamento").nextElementSibling).toHaveTextContent("3");
    expect(screen.getByText("Concluídas").nextElementSibling).toHaveTextContent("1");
  });

  it("não exibe números enquanto o resumo está carregando", () => {
    render(<DemandSummaryCards summary={undefined} isLoading />);

    expect(screen.queryByText("Total de demandas")).not.toBeInTheDocument();
  });

  it("exibe zeros quando ainda não há nenhuma demanda", () => {
    render(
      <DemandSummaryCards
        summary={{ total: 0, pending: 0, inProgress: 0, completed: 0, cancelled: 0 }}
        isLoading={false}
      />,
    );

    expect(screen.getByText("Total de demandas").nextElementSibling).toHaveTextContent("0");
  });
});
