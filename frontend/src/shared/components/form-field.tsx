import type { ReactNode } from "react";

import { Label } from "@/shared/components/ui/label";

interface FormFieldProps {
  label: string;
  /** Id do controle, usado para ligar rótulo, campo e mensagem de erro. */
  fieldId: string;
  error?: string;
  children: ReactNode;
}

/** Agrupa rótulo, campo e mensagem de erro com a ligação de acessibilidade correta. */
export function FormField({ label, fieldId, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      {children}
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
