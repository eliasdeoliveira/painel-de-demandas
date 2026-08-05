import { Badge } from "@/shared/components/ui/badge";

import { DEMAND_STATUS_APPEARANCE } from "@/features/demands/constants/demand-status-appearance";
import { DEMAND_STATUS_LABELS } from "@/features/demands/constants/demand-options";
import type { DemandStatus } from "@/features/demands/types/demand";

export function DemandStatusBadge({ status }: { status: DemandStatus }) {
  const { icon: StatusIcon, surface } = DEMAND_STATUS_APPEARANCE[status];

  return (
    <Badge variant="outline" className={surface}>
      <StatusIcon className="size-3.5" aria-hidden />
      {DEMAND_STATUS_LABELS[status]}
    </Badge>
  );
}
