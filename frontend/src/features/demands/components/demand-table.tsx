"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatDate } from "@/shared/lib/format";

import { DemandActions } from "@/features/demands/components/demand-actions";
import { DemandPriorityBadge } from "@/features/demands/components/demand-priority-badge";
import { DemandStatusSelect } from "@/features/demands/components/demand-status-select";
import type { Demand, DemandStatus } from "@/features/demands/types/demand";

interface DemandTableProps {
  demands: Demand[];
  /** Recebe a demanda inteira: o status anterior é necessário para a atualização otimista. */
  onStatusChange: (demand: Demand, status: DemandStatus) => void;
  onDelete: (demand: Demand) => void;
  isBusy: boolean;
}

export function DemandTable({ demands, onStatusChange, onDelete, isBusy }: DemandTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Demanda</TableHead>
          <TableHead>Solicitante</TableHead>
          <TableHead className="text-center">Impacto</TableHead>
          <TableHead className="text-center">Urgência</TableHead>
          <TableHead className="text-center">Prioridade</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Criada em</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {demands.map((demand) => (
          <TableRow key={demand.id}>
            <TableCell className="max-w-xs">
              <p className="font-medium">{demand.title}</p>
              <p className="truncate text-sm text-muted-foreground">{demand.description}</p>
            </TableCell>
            <TableCell>{demand.requester}</TableCell>
            <TableCell className="text-center tabular-nums">{demand.impact}</TableCell>
            <TableCell className="text-center tabular-nums">{demand.urgency}</TableCell>
            <TableCell className="text-center">
              <DemandPriorityBadge score={demand.priorityScore} />
            </TableCell>
            <TableCell>
              <DemandStatusSelect
                demand={demand}
                disabled={isBusy}
                onChange={(status) => onStatusChange(demand, status)}
              />
            </TableCell>
            <TableCell className="whitespace-nowrap">{formatDate(demand.createdAt)}</TableCell>
            <TableCell>
              <div className="flex justify-end">
                <DemandActions
                  demand={demand}
                  disabled={isBusy}
                  onDelete={() => onDelete(demand)}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
