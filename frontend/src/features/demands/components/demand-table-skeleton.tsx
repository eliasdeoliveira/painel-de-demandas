import { Skeleton } from "@/shared/components/ui/skeleton";

const PLACEHOLDER_ROW_COUNT = 5;

/** Espelha a altura das linhas da tabela para o layout não saltar ao carregar. */
export function DemandTableSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-busy aria-label="Carregando demandas">
      {Array.from({ length: PLACEHOLDER_ROW_COUNT }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
