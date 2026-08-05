import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DemandForm } from "@/features/demands/components/demand-form";

function renderForm(overrides: Partial<Parameters<typeof DemandForm>[0]> = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();

  render(<DemandForm onSubmit={onSubmit} onCancel={onCancel} isSubmitting={false} {...overrides} />);

  return { onSubmit, onCancel, user: userEvent.setup() };
}

describe("DemandForm", () => {
  it("renderiza todos os campos da demanda", () => {
    renderForm();

    expect(screen.getByLabelText("Título")).toBeInTheDocument();
    expect(screen.getByLabelText("Descrição")).toBeInTheDocument();
    expect(screen.getByLabelText("Solicitante")).toBeInTheDocument();
    expect(screen.getByLabelText("Impacto")).toBeInTheDocument();
    expect(screen.getByLabelText("Urgência")).toBeInTheDocument();
  });

  it("exibe as mensagens de validação e não envia quando o formulário está vazio", async () => {
    const { onSubmit, user } = renderForm();

    await user.click(screen.getByRole("button", { name: "Cadastrar demanda" }));

    expect(
      await screen.findByText("Informe um título com pelo menos 3 caracteres."),
    ).toBeInTheDocument();
    expect(screen.getByText("Descreva a demanda com pelo menos 3 caracteres.")).toBeInTheDocument();
    expect(screen.getByText("Informe quem está solicitando.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejeita um título curto demais", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("Título"), "ab");
    await user.type(screen.getByLabelText("Descrição"), "Descrição válida");
    await user.type(screen.getByLabelText("Solicitante"), "Ana Souza");
    await user.click(screen.getByRole("button", { name: "Cadastrar demanda" }));

    expect(
      await screen.findByText("Informe um título com pelo menos 3 caracteres."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejeita um título formado apenas por espaços", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("Título"), "     ");
    await user.type(screen.getByLabelText("Descrição"), "Descrição válida");
    await user.type(screen.getByLabelText("Solicitante"), "Ana Souza");
    await user.click(screen.getByRole("button", { name: "Cadastrar demanda" }));

    expect(
      await screen.findByText("Informe um título com pelo menos 3 caracteres."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("envia os dados preenchidos, com impacto e urgência padrão", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("Título"), "Exportar relatório em CSV");
    await user.type(screen.getByLabelText("Descrição"), "O time comercial precisa exportar.");
    await user.type(screen.getByLabelText("Solicitante"), "Ana Souza");
    await user.click(screen.getByRole("button", { name: "Cadastrar demanda" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({
      title: "Exportar relatório em CSV",
      description: "O time comercial precisa exportar.",
      requester: "Ana Souza",
      impact: 3,
      urgency: 3,
    });
  });

  it("desabilita os botões enquanto o cadastro está sendo enviado", () => {
    renderForm({ isSubmitting: true });

    expect(screen.getByRole("button", { name: "Salvando..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });

  it("avisa o componente pai quando o usuário cancela", async () => {
    const { onCancel, user } = renderForm();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
