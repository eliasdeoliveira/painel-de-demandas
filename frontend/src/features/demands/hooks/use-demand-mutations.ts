"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/shared/services/api-error";
import type { Page } from "@/shared/types/pagination";

import { demandKeys } from "@/features/demands/api/demand-keys";
import { createDemand, deleteDemand, updateDemandStatus } from "@/features/demands/api/demands-api";
import type {
  CreateDemandInput,
  Demand,
  DemandStatus,
  DemandSummary,
} from "@/features/demands/types/demand";
import {
  applyRemovalToSummary,
  applyStatusChangeToSummary,
} from "@/features/demands/utils/summary-changes";

/** Estado do cache antes de uma alteração otimista, usado para desfazê-la. */
interface DemandCacheSnapshot {
  lists: [readonly unknown[], Page<Demand> | undefined][];
  summary: DemandSummary | undefined;
}

function invalidateDemands(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: demandKeys.all });
}

/**
 * Congela as requisições em voo e guarda o cache atual.
 *
 * Cancelar antes de escrever evita que uma resposta antiga, já a caminho,
 * sobrescreva a alteração otimista logo depois de ela ser aplicada.
 */
async function cancelAndSnapshot(queryClient: QueryClient): Promise<DemandCacheSnapshot> {
  await queryClient.cancelQueries({ queryKey: demandKeys.all });

  return {
    lists: queryClient.getQueriesData<Page<Demand>>({ queryKey: demandKeys.lists() }),
    summary: queryClient.getQueryData<DemandSummary>(demandKeys.summary()),
  };
}

function restoreSnapshot(queryClient: QueryClient, snapshot: DemandCacheSnapshot | undefined) {
  snapshot?.lists.forEach(([queryKey, cachedPage]) => {
    queryClient.setQueryData(queryKey, cachedPage);
  });
  queryClient.setQueryData(demandKeys.summary(), snapshot?.summary);
}

function updateCachedSummary(
  queryClient: QueryClient,
  update: (summary: DemandSummary) => DemandSummary,
) {
  queryClient.setQueryData<DemandSummary>(demandKeys.summary(), (summary) =>
    summary ? update(summary) : summary,
  );
}

function updateCachedLists(
  queryClient: QueryClient,
  update: (page: Page<Demand>) => Page<Demand>,
) {
  queryClient.setQueriesData<Page<Demand>>({ queryKey: demandKeys.lists() }, (cachedPage) =>
    cachedPage ? update(cachedPage) : cachedPage,
  );
}

/**
 * Cadastro não é otimista de propósito.
 *
 * A pontuação e o identificador vêm do servidor, e a posição da demanda depende
 * da ordenação e da página atual. Inserir um item provisório o colocaria no
 * lugar errado com frequência — um erro visível para economizar uma fração de
 * segundo, já que o diálogo fecha e a lista se atualiza em seguida.
 */
export function useCreateDemand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDemandInput) => createDemand(input),
    onSuccess: () => {
      toast.success("Demanda cadastrada.");
      return invalidateDemands(queryClient);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Não foi possível cadastrar a demanda."));
    },
  });
}

/**
 * Altera o status com atualização otimista na tabela e no resumo.
 *
 * A demanda inteira chega como argumento porque o status anterior é necessário
 * para mover a contagem de um card para o outro.
 */
export function useUpdateDemandStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ demand, status }: { demand: Demand; status: DemandStatus }) =>
      updateDemandStatus(demand.id, status),

    onMutate: async ({ demand, status }) => {
      const snapshot = await cancelAndSnapshot(queryClient);

      updateCachedLists(queryClient, (page) => ({
        ...page,
        items: page.items.map((item) => (item.id === demand.id ? { ...item, status } : item)),
      }));
      updateCachedSummary(queryClient, (summary) =>
        applyStatusChangeToSummary(summary, demand.status, status),
      );

      return snapshot;
    },

    onError: (error, _variables, snapshot) => {
      restoreSnapshot(queryClient, snapshot);
      toast.error(getApiErrorMessage(error, "Não foi possível atualizar o status."));
    },

    onSuccess: () => {
      toast.success("Status atualizado.");
    },

    // Roda no sucesso e no erro: o servidor é sempre a fonte final da verdade.
    onSettled: () => invalidateDemands(queryClient),
  });
}

/** Remove a demanda com atualização otimista, desfazendo tudo se a API recusar. */
export function useDeleteDemand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (demand: Demand) => deleteDemand(demand.id),

    onMutate: async (demand) => {
      const snapshot = await cancelAndSnapshot(queryClient);

      updateCachedLists(queryClient, (page) => {
        const remainingItems = page.items.filter((item) => item.id !== demand.id);
        const total = Math.max(0, page.total - 1);

        return {
          ...page,
          items: remainingItems,
          total,
          totalPages: Math.ceil(total / page.limit),
        };
      });
      updateCachedSummary(queryClient, (summary) => applyRemovalToSummary(summary, demand.status));

      return snapshot;
    },

    onError: (error, _demand, snapshot) => {
      restoreSnapshot(queryClient, snapshot);
      toast.error(getApiErrorMessage(error, "Não foi possível remover a demanda."));
    },

    onSuccess: () => {
      toast.success("Demanda removida.");
    },

    onSettled: () => invalidateDemands(queryClient),
  });
}
