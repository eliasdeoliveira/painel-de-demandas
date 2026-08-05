"use client";

import { formatDate } from "@/shared/lib/format";

import { DemandActions } from "@/features/demands/components/demand-actions";
import { DemandPriorityBadge } from "@/features/demands/components/demand-priority-badge";
import { DemandStatusSelect } from "@/features/demands/components/demand-status-select";
import type { Demand, DemandStatus } from "@/features/demands/types/demand";

interface DemandCardProps {
  demand: Demand;
  onStatusChange: (status: DemandStatus) => void;
  onDelete: () => void;
  isBusy: boolean;
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * Versão da demanda para telas estreitas.
 *
 * Mostra os mesmos campos exigidos na tabela — inclusive prioridade, status e
 * data de criação — sem depender de rolagem horizontal.
 */
export function DemandCard({ demand, onStatusChange, onDelete, isBusy }: DemandCardProps) {
  return (
    <li className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{demand.title}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{demand.description}</p>
        </div>
        <DemandPriorityBadge score={demand.priorityScore} />
      </div>

      <dl className="grid grid-cols-3 gap-3">
        <DetailItem label="Solicitante" value={demand.requester} />
        <DetailItem label="Impacto" value={demand.impact} />
        <DetailItem label="Urgência" value={demand.urgency} />
      </dl>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs text-muted-foreground">
            Criada em {formatDate(demand.createdAt)}
          </p>
          <DemandStatusSelect
            demand={demand}
            disabled={isBusy}
            onChange={onStatusChange}
            className="sm:w-full"
          />
        </div>
        <DemandActions demand={demand} disabled={isBusy} onDelete={onDelete} />
      </div>
    </li>
  );
}
