import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleSlashIcon,
  ClockIcon,
  type LucideIcon,
} from "lucide-react";

import type { DemandStatus } from "@/features/demands/types/demand";

interface StatusAppearance {
  icon: LucideIcon;
  /** Fundo, borda e texto do selo e do seletor de status. */
  surface: string;
  /** Cor do ícone quando ele aparece sozinho, sem fundo. */
  accent: string;
}

/**
 * Aparência de cada status, em um lugar só.
 *
 * Selo, seletor da linha e card de resumo consomem daqui, de modo que "Em
 * andamento" seja sempre o mesmo azul nos três. As variantes `dark:` existem
 * porque a página acompanha o tema do sistema.
 */
export const DEMAND_STATUS_APPEARANCE: Record<DemandStatus, StatusAppearance> = {
  pending: {
    icon: ClockIcon,
    surface:
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
    accent: "text-amber-600 dark:text-amber-400",
  },
  in_progress: {
    icon: CircleDashedIcon,
    surface:
      "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
    accent: "text-blue-600 dark:text-blue-400",
  },
  completed: {
    icon: CircleCheckIcon,
    surface:
      "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  cancelled: {
    icon: CircleSlashIcon,
    surface:
      "border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
    accent: "text-neutral-500 dark:text-neutral-400",
  },
};

/**
 * Faixas usadas para colorir a pontuação de prioridade.
 *
 * A pontuação vem calculada do servidor; a cor só ajuda a varrer a lista.
 */
const HIGH_PRIORITY_THRESHOLD = 12;
const MEDIUM_PRIORITY_THRESHOLD = 8;

export function getPrioritySurface(score: number): string {
  if (score >= HIGH_PRIORITY_THRESHOLD) {
    return "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200";
  }
  if (score >= MEDIUM_PRIORITY_THRESHOLD) {
    return "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200";
  }
  return "border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300";
}
