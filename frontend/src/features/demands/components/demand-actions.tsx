"use client";

import { DeleteDemandButton } from "@/features/demands/components/delete-demand-button";
import { DemandHistoryDialog } from "@/features/demands/components/demand-history-dialog";
import type { Demand } from "@/features/demands/types/demand";

interface DemandActionsProps {
  demand: Demand;
  onDelete: () => void;
  disabled: boolean;
}

/** Ações de uma demanda, compartilhadas pela tabela e pelo cartão. */
export function DemandActions({ demand, onDelete, disabled }: DemandActionsProps) {
  return (
    <div className="flex items-center">
      <DemandHistoryDialog demand={demand} />
      <DeleteDemandButton demandTitle={demand.title} disabled={disabled} onConfirm={onDelete} />
    </div>
  );
}
