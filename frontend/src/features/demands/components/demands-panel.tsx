"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { getApiErrorMessage } from "@/shared/services/api-error";

import { CreateDemandDialog } from "@/features/demands/components/create-demand-dialog";
import { DemandFilters } from "@/features/demands/components/demand-filters";
import { DemandPagination } from "@/features/demands/components/demand-pagination";
import { DemandList } from "@/features/demands/components/demand-list";
import { DemandSummaryCards } from "@/features/demands/components/demand-summary-cards";
import { DemandTableSkeleton } from "@/features/demands/components/demand-table-skeleton";
import { DEFAULT_DEMAND_FILTERS } from "@/features/demands/constants/demand-options";
import {
  useDeleteDemand,
  useUpdateDemandStatus,
} from "@/features/demands/hooks/use-demand-mutations";
import { useDemands, useDemandSummary } from "@/features/demands/hooks/use-demands";
import type { DemandListFilters } from "@/features/demands/types/demand";
import { hasActiveFilters } from "@/features/demands/utils/has-active-filters";
import { findLastValidPage, isPageOutOfRange } from "@/features/demands/utils/page-recovery";

export function DemandsPanel() {
  const [filters, setFilters] = useState<DemandListFilters>(DEFAULT_DEMAND_FILTERS);

  // Os campos de texto respondem a cada tecla, mas só chegam à API quando o
  // usuário faz uma pausa.
  const debouncedSearch = useDebouncedValue(filters.search);
  const debouncedRequester = useDebouncedValue(filters.requester);
  const appliedFilters: DemandListFilters = {
    ...filters,
    search: debouncedSearch,
    requester: debouncedRequester,
  };

  const demandsQuery = useDemands(appliedFilters);
  const summaryQuery = useDemandSummary();
  const updateStatus = useUpdateDemandStatus();
  const deleteDemand = useDeleteDemand();

  /** Qualquer mudança de filtro devolve o usuário à primeira página. */
  function handleFiltersChange(changes: Partial<DemandListFilters>) {
    setFilters((current) => ({ ...current, ...changes, page: changes.page ?? 1 }));
  }

  // Remover a única demanda da última página deixaria o usuário parado em uma
  // página que não existe mais. O servidor informa quantas páginas restaram,
  // então dá para voltar para a última válida sem uma consulta extra.
  const currentPage = demandsQuery.data;
  useEffect(() => {
    if (!currentPage || !isPageOutOfRange(currentPage)) {
      return;
    }

    const lastValidPage = findLastValidPage(currentPage);
    setFilters((current) =>
      current.page === lastValidPage ? current : { ...current, page: lastValidPage },
    );
  }, [currentPage]);

  function renderDemandList() {
    if (demandsQuery.isError) {
      return (
        <ErrorState
          title="Não foi possível carregar as demandas"
          message={getApiErrorMessage(demandsQuery.error, "Tente novamente em instantes.")}
          onRetry={() => demandsQuery.refetch()}
        />
      );
    }

    if (demandsQuery.isPending) {
      return <DemandTableSkeleton />;
    }

    const page = demandsQuery.data;

    // A correção da página já está a caminho; anunciar "nenhuma demanda" aqui
    // seria mentira, porque elas estão nas páginas anteriores.
    if (isPageOutOfRange(page)) {
      return <DemandTableSkeleton />;
    }

    if (page.items.length === 0) {
      return hasActiveFilters(appliedFilters) ? (
        <EmptyState
          title="Nenhuma demanda encontrada"
          description="Nenhuma demanda atende aos filtros aplicados. Ajuste a busca ou limpe os filtros."
        />
      ) : (
        <EmptyState
          title="Nenhuma demanda cadastrada"
          description="Cadastre a primeira demanda para começar a priorizar o backlog do produto."
          action={<CreateDemandDialog />}
        />
      );
    }

    return (
      <>
        <DemandList
          demands={page.items}
          isBusy={updateStatus.isPending || deleteDemand.isPending}
          onStatusChange={(demand, status) => updateStatus.mutate({ demand, status })}
          onDelete={(demand) => deleteDemand.mutate(demand)}
        />
        <DemandPagination
          page={page}
          onPageChange={(nextPage) => handleFiltersChange({ page: nextPage })}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel de Demandas</h1>
          <p className="text-sm text-muted-foreground">
            Demandas ordenadas por prioridade: (impacto × 2) + urgência.
          </p>
        </div>
        <CreateDemandDialog />
      </header>

      <DemandSummaryCards summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />

      <DemandFilters
        filters={filters}
        onChange={handleFiltersChange}
        onReset={() => setFilters(DEFAULT_DEMAND_FILTERS)}
      />

      <section className="rounded-lg border">{renderDemandList()}</section>
    </div>
  );
}
