const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Formata uma data ISO devolvida pela API no padrão brasileiro.
 *
 * A API sempre envia o instante em UTC; o `Date` converte para o fuso de quem
 * está usando o painel.
 */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Data e hora, para a linha do tempo, onde a ordem dos eventos importa. */
export function formatDateTime(isoDate: string): string {
  return dateTimeFormatter.format(new Date(isoDate));
}
