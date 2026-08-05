"use client";

import { Button } from "@/shared/components/ui/button";
import type { Page } from "@/shared/types/pagination";

import type { Demand } from "@/features/demands/types/demand";

interface DemandPaginationProps {
  page: Page<Demand>;
  onPageChange: (page: number) => void;
}

export function DemandPagination({ page, onPageChange }: DemandPaginationProps) {
  const firstItemPosition = (page.page - 1) * page.limit + 1;
  const lastItemPosition = firstItemPosition + page.items.length - 1;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Exibindo {firstItemPosition}–{lastItemPosition} de {page.total}{" "}
        {page.total === 1 ? "demanda" : "demandas"}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page.page <= 1}
          onClick={() => onPageChange(page.page - 1)}
        >
          Anterior
        </Button>
        <span className="text-sm tabular-nums">
          Página {page.page} de {page.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page.page >= page.totalPages}
          onClick={() => onPageChange(page.page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
