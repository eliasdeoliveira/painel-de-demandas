"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";

import { DEMAND_STATUS_LABELS } from "@/features/demands/constants/demand-options";
import { DEMAND_STATUS_APPEARANCE } from "@/features/demands/constants/demand-status-appearance";
import { DEMAND_STATUSES, type Demand, type DemandStatus } from "@/features/demands/types/demand";

interface DemandStatusSelectProps {
  demand: Demand;
  onChange: (status: DemandStatus) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Troca o status direto na linha, sem abrir outra tela.
 *
 * O próprio seletor carrega a cor do status atual, então ele comunica o estado
 * e permite mudá-lo — não é preciso um selo ao lado repetindo a mesma palavra.
 */
export function DemandStatusSelect({
  demand,
  onChange,
  disabled,
  className,
}: DemandStatusSelectProps) {
  // Só a superfície: o ícone do status atual já vem do `SelectValue`, que
  // reaproveita o conteúdo do item selecionado.
  const { surface } = DEMAND_STATUS_APPEARANCE[demand.status];

  return (
    <Select
      value={demand.status}
      disabled={disabled}
      onValueChange={(value) => onChange(value as DemandStatus)}
    >
      <SelectTrigger
        size="sm"
        className={cn("w-full font-medium sm:w-44", surface, className)}
        aria-label={`Alterar status da demanda ${demand.title}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DEMAND_STATUSES.map((status) => {
          const { icon: StatusIcon, accent } = DEMAND_STATUS_APPEARANCE[status];
          return (
            <SelectItem key={status} value={status}>
              <StatusIcon className={cn("size-3.5", accent)} aria-hidden />
              {DEMAND_STATUS_LABELS[status]}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
