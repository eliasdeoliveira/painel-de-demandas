"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import {
  DEMAND_SORT_FIELD_LABELS,
  DEMAND_STATUS_LABELS,
  LEVEL_OPTIONS,
} from "@/features/demands/constants/demand-options";
import {
  DEMAND_SORT_FIELDS,
  DEMAND_STATUSES,
  type DemandListFilters,
  type DemandSortField,
  type DemandStatus,
  type SortOrder,
} from "@/features/demands/types/demand";

/** O Select do Radix não aceita item de valor vazio, então "sem filtro" tem um código próprio. */
const ANY_OPTION = "all";

/**
 * Os ids são prefixados porque o formulário de cadastro tem campos de mesmo
 * nome. Com o diálogo aberto, ids repetidos quebrariam a ligação entre rótulo e
 * campo: o navegador associa o rótulo ao primeiro elemento encontrado.
 */
const FIELD_ID = {
  search: "filter-search",
  requester: "filter-requester",
  status: "filter-status",
  impact: "filter-impact",
  sort: "filter-sort",
  order: "filter-order",
} as const;

interface DemandFiltersProps {
  filters: DemandListFilters;
  onChange: (changes: Partial<DemandListFilters>) => void;
  onReset: () => void;
}

export function DemandFilters({ filters, onChange, onReset }: DemandFiltersProps) {
  return (
    // Duas colunas já no celular: seis campos empilhados empurrariam a lista
    // para muito abaixo da dobra.
    <div className="grid grid-cols-2 gap-3 rounded-lg border p-4 sm:gap-4 xl:grid-cols-6">
      <div className="col-span-2 space-y-2 xl:col-span-2">
        <Label htmlFor={FIELD_ID.search}>Buscar por título</Label>
        <Input
          id={FIELD_ID.search}
          placeholder="Ex.: exportar relatório"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={FIELD_ID.requester}>Solicitante</Label>
        <Input
          id={FIELD_ID.requester}
          placeholder="Ex.: Ana"
          value={filters.requester}
          onChange={(event) => onChange({ requester: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={FIELD_ID.status}>Status</Label>
        <Select
          value={filters.status ?? ANY_OPTION}
          onValueChange={(value) =>
            onChange({ status: value === ANY_OPTION ? undefined : (value as DemandStatus) })
          }
        >
          <SelectTrigger id={FIELD_ID.status} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_OPTION}>Todos</SelectItem>
            {DEMAND_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {DEMAND_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={FIELD_ID.impact}>Impacto</Label>
        <Select
          value={filters.impact ? String(filters.impact) : ANY_OPTION}
          onValueChange={(value) =>
            onChange({ impact: value === ANY_OPTION ? undefined : Number(value) })
          }
        >
          <SelectTrigger id={FIELD_ID.impact} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_OPTION}>Todos</SelectItem>
            {LEVEL_OPTIONS.map((level) => (
              <SelectItem key={level} value={String(level)}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={FIELD_ID.sort}>Ordenar por</Label>
        <Select
          value={filters.sort}
          onValueChange={(value) => onChange({ sort: value as DemandSortField })}
        >
          <SelectTrigger id={FIELD_ID.sort} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEMAND_SORT_FIELDS.map((field) => (
              <SelectItem key={field} value={field}>
                {DEMAND_SORT_FIELD_LABELS[field]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={FIELD_ID.order}>Direção</Label>
        <Select
          value={filters.order}
          onValueChange={(value) => onChange({ order: value as SortOrder })}
        >
          <SelectTrigger id={FIELD_ID.order} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Maior para menor</SelectItem>
            <SelectItem value="asc">Menor para maior</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-2 flex items-end xl:col-span-6">
        <Button variant="ghost" onClick={onReset}>
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}
