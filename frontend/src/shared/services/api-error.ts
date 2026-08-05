import { isAxiosError } from "axios";

/** Formato de erro padronizado pelo backend. */
interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: { field: string; message: string }[];
  };
}

const CONNECTION_ERROR_MESSAGE =
  "Não foi possível falar com o servidor. Verifique se a API está no ar e tente novamente.";

function hasApiErrorBody(data: unknown): data is ApiErrorBody {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as ApiErrorBody).error?.message === "string"
  );
}

/**
 * Extrai uma mensagem exibível para o usuário a partir de um erro de requisição.
 *
 * Distingue falha de conexão de erro devolvido pela API, porque as duas pedem
 * ações diferentes de quem está usando o painel.
 */
export function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!isAxiosError(error)) {
    return fallbackMessage;
  }

  if (!error.response) {
    return CONNECTION_ERROR_MESSAGE;
  }

  return hasApiErrorBody(error.response.data) ? error.response.data.error.message : fallbackMessage;
}
