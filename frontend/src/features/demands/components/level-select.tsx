"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import { LEVEL_OPTIONS } from "@/features/demands/constants/demand-options";

interface LevelSelectProps {
  id: string;
  value: number;
  onChange: (level: number) => void;
  hasError?: boolean;
}

/** Seleção de um nível de 1 a 5, usada por impacto e urgência no formulário. */
export function LevelSelect({ id, value, onChange, hasError }: LevelSelectProps) {
  return (
    <Select value={String(value)} onValueChange={(level) => onChange(Number(level))}>
      <SelectTrigger
        id={id}
        className="w-full"
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LEVEL_OPTIONS.map((level) => (
          <SelectItem key={level} value={String(level)}>
            {level}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
