/** Envelope devolvido por qualquer listagem paginada da API. */
export interface Page<TItem> {
  items: TItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
