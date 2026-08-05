import type { Page } from "@/shared/types/pagination";

/**
 * Indica que a página pedida deixou de existir.
 *
 * Acontece quando o total encolhe sem que a página corrente mude — remover a
 * única demanda da última página é o caso típico. Sem tratar isso, o painel
 * ficaria preso em uma página vazia anunciando que não há nenhuma demanda
 * cadastrada, enquanto as demais continuam nas páginas anteriores.
 */
export function isPageOutOfRange<TItem>(page: Page<TItem>): boolean {
  return page.items.length === 0 && page.page > 1;
}

/**
 * Última página que ainda tem conteúdo.
 *
 * Uma listagem sem nenhum resultado tem `totalPages` igual a zero, e nesse caso
 * o destino é a primeira página — que exibe o estado vazio correto.
 */
export function findLastValidPage<TItem>(page: Page<TItem>): number {
  return Math.max(1, page.totalPages);
}
