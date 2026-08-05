import { z } from "zod";

/**
 * Validação do formulário de cadastro.
 *
 * As regras espelham as do backend para que o usuário receba o erro antes do
 * envio. A validação daqui existe para a experiência de uso: quem garante a
 * integridade dos dados continua sendo o servidor.
 */
export const demandFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Informe um título com pelo menos 3 caracteres.")
    .max(120, "O título deve ter no máximo 120 caracteres."),
  description: z
    .string()
    .trim()
    .min(3, "Descreva a demanda com pelo menos 3 caracteres.")
    .max(2000, "A descrição deve ter no máximo 2000 caracteres."),
  requester: z
    .string()
    .trim()
    .min(2, "Informe quem está solicitando.")
    .max(80, "O nome do solicitante deve ter no máximo 80 caracteres."),
  impact: z.number().int().min(1).max(5),
  urgency: z.number().int().min(1).max(5),
});

export type DemandFormValues = z.infer<typeof demandFormSchema>;

export const DEMAND_FORM_DEFAULT_VALUES: DemandFormValues = {
  title: "",
  description: "",
  requester: "",
  impact: 3,
  urgency: 3,
};
