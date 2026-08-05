"use client";

import { useState } from "react";

import { ArrowRightIcon, HistoryIcon } from "lucide-react";

import { ErrorState } from "@/shared/components/error-state";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatDateTime } from "@/shared/lib/format";
import { getApiErrorMessage } from "@/shared/services/api-error";

import { DemandStatusBadge } from "@/features/demands/components/demand-status-badge";
import { useDemandStatusHistory } from "@/features/demands/hooks/use-demands";
import type { Demand, DemandStatusChange } from "@/features/demands/types/demand";

const PLACEHOLDER_EVENT_COUNT = 3;

function TimelineEvent({ event }: { event: DemandStatusChange }) {
  return (
    <li className="flex flex-col gap-1 border-l-2 py-2 pl-4">
      <div className="flex flex-wrap items-center gap-2">
        {event.fromStatus === null ? (
          <>
            <span className="text-sm">Demanda cadastrada como</span>
            <DemandStatusBadge status={event.toStatus} />
          </>
        ) : (
          <>
            <DemandStatusBadge status={event.fromStatus} />
            <ArrowRightIcon className="size-4 text-muted-foreground" aria-label="alterada para" />
            <DemandStatusBadge status={event.toStatus} />
          </>
        )}
      </div>
      <time dateTime={event.changedAt} className="text-xs text-muted-foreground">
        {formatDateTime(event.changedAt)}
      </time>
    </li>
  );
}

export function DemandHistoryDialog({ demand }: { demand: Demand }) {
  const [isOpen, setIsOpen] = useState(false);
  const historyQuery = useDemandStatusHistory(demand.id, isOpen);

  function renderTimeline() {
    if (historyQuery.isError) {
      return (
        <ErrorState
          title="Não foi possível carregar o histórico"
          message={getApiErrorMessage(historyQuery.error, "Tente novamente em instantes.")}
          onRetry={() => historyQuery.refetch()}
        />
      );
    }

    if (historyQuery.isPending) {
      return (
        <div className="space-y-3" aria-busy aria-label="Carregando histórico">
          {Array.from({ length: PLACEHOLDER_EVENT_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    return (
      <ol className="space-y-1">
        {historyQuery.data.map((event) => (
          <TimelineEvent key={event.id} event={event} />
        ))}
      </ol>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Ver histórico da demanda ${demand.title}`}>
          <HistoryIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Histórico de status</DialogTitle>
          <DialogDescription>
            {demand.title} — do cadastro à última alteração.
          </DialogDescription>
        </DialogHeader>
        {renderTimeline()}
      </DialogContent>
    </Dialog>
  );
}
