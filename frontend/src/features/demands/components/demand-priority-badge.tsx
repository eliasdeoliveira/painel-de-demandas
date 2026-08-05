import { Badge } from "@/shared/components/ui/badge";

import { getPrioritySurface } from "@/features/demands/constants/demand-status-appearance";

export function DemandPriorityBadge({ score }: { score: number }) {
  return (
    <Badge
      variant="outline"
      className={`min-w-8 justify-center tabular-nums ${getPrioritySurface(score)}`}
    >
      {score}
    </Badge>
  );
}
