"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { demandKeys } from "@/features/demands/api/demand-keys";
import {
  fetchDemands,
  fetchDemandStatusHistory,
  fetchDemandSummary,
} from "@/features/demands/api/demands-api";
import type { DemandListFilters } from "@/features/demands/types/demand";

/**
 * Busca a página de demandas correspondente aos filtros.
 *
 * `keepPreviousData` mantém a tabela anterior visível enquanto a próxima página
 * carrega, evitando que a tela pisque a cada troca de filtro.
 */
export function useDemands(filters: DemandListFilters) {
  return useQuery({
    queryKey: demandKeys.list(filters),
    queryFn: () => fetchDemands(filters),
    placeholderData: keepPreviousData,
  });
}

export function useDemandSummary() {
  return useQuery({
    queryKey: demandKeys.summary(),
    queryFn: fetchDemandSummary,
  });
}

/**
 * Busca a linha do tempo de uma demanda.
 *
 * `enabled` deixa a consulta desligada até o diálogo abrir: buscar o histórico
 * de todas as linhas da tabela seria uma requisição por demanda, para um dado
 * que quase nunca é aberto.
 */
export function useDemandStatusHistory(demandId: number, enabled: boolean) {
  return useQuery({
    queryKey: demandKeys.statusHistory(demandId),
    queryFn: () => fetchDemandStatusHistory(demandId),
    enabled,
  });
}
