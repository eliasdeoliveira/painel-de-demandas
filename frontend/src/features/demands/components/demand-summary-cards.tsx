"use client";

import { LayersIcon, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

import { DEMAND_STATUS_APPEARANCE } from "@/features/demands/constants/demand-status-appearance";
import type { DemandSummary } from "@/features/demands/types/demand";

interface DemandSummaryCardsProps {
  summary: DemandSummary | undefined;
  isLoading: boolean;
}

interface SummaryCard {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
}

const CARD_COUNT = 5;

// O total ocupa a linha inteira no celular: é o número que se lê primeiro, e os
// quatro estados cabem em duas colunas logo abaixo.
const GRID_CLASSNAME = "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5";
const TOTAL_CARD_CLASSNAME = "col-span-2 lg:col-span-1";

function buildCards(summary: DemandSummary): SummaryCard[] {
  return [
    {
      label: "Total de demandas",
      value: summary.total,
      icon: LayersIcon,
      accent: "text-foreground",
    },
    {
      label: "Pendentes",
      value: summary.pending,
      ...DEMAND_STATUS_APPEARANCE.pending,
    },
    {
      label: "Em andamento",
      value: summary.inProgress,
      ...DEMAND_STATUS_APPEARANCE.in_progress,
    },
    {
      label: "Concluídas",
      value: summary.completed,
      ...DEMAND_STATUS_APPEARANCE.completed,
    },
    {
      label: "Canceladas",
      value: summary.cancelled,
      ...DEMAND_STATUS_APPEARANCE.cancelled,
    },
  ];
}

export function DemandSummaryCards({ summary, isLoading }: DemandSummaryCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className={GRID_CLASSNAME}>
        {Array.from({ length: CARD_COUNT }).map((_, index) => (
          <Skeleton key={index} className={cn("h-24 w-full", index === 0 && TOTAL_CARD_CLASSNAME)} />
        ))}
      </div>
    );
  }

  return (
    <div className={GRID_CLASSNAME}>
      {buildCards(summary).map((card, index) => (
        <Card key={card.label} className={cn(index === 0 && TOTAL_CARD_CLASSNAME)}>
          <CardContent className="flex items-center gap-3">
            <span className={cn("rounded-lg border p-2", card.accent)}>
              <card.icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              {/* Sem truncar: "Em andamento" não cabe em uma linha no celular e
                  vira "Em andame…" — melhor quebrar em duas. */}
              <p className="text-sm leading-tight text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-semibold tabular-nums sm:text-3xl">{card.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
