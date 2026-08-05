"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

import { LevelSelect } from "@/features/demands/components/level-select";
import {
  DEMAND_FORM_DEFAULT_VALUES,
  demandFormSchema,
  type DemandFormValues,
} from "@/features/demands/schemas/demand-form-schema";

/** Prefixados para não colidir com os campos da barra de filtros da página. */
const FIELD_ID = {
  title: "demand-title",
  description: "demand-description",
  requester: "demand-requester",
  impact: "demand-impact",
  urgency: "demand-urgency",
} as const;

interface DemandFormProps {
  onSubmit: (values: DemandFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function DemandForm({ onSubmit, onCancel, isSubmitting }: DemandFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DemandFormValues>({
    resolver: zodResolver(demandFormSchema),
    defaultValues: DEMAND_FORM_DEFAULT_VALUES,
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormField label="Título" fieldId={FIELD_ID.title} error={errors.title?.message}>
        <Input
          id={FIELD_ID.title}
          placeholder="Ex.: Exportar relatório em CSV"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? `${FIELD_ID.title}-error` : undefined}
          {...register("title")}
        />
      </FormField>

      <FormField
        label="Descrição"
        fieldId={FIELD_ID.description}
        error={errors.description?.message}
      >
        <Textarea
          id={FIELD_ID.description}
          rows={4}
          placeholder="Contexto da solicitação e resultado esperado"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? `${FIELD_ID.description}-error` : undefined}
          {...register("description")}
        />
      </FormField>

      <FormField label="Solicitante" fieldId={FIELD_ID.requester} error={errors.requester?.message}>
        <Input
          id={FIELD_ID.requester}
          placeholder="Ex.: Ana Souza"
          aria-invalid={Boolean(errors.requester)}
          aria-describedby={errors.requester ? `${FIELD_ID.requester}-error` : undefined}
          {...register("requester")}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Impacto" fieldId={FIELD_ID.impact} error={errors.impact?.message}>
          <Controller
            control={control}
            name="impact"
            render={({ field }) => (
              <LevelSelect
                id={FIELD_ID.impact}
                value={field.value}
                onChange={field.onChange}
                hasError={Boolean(errors.impact)}
              />
            )}
          />
        </FormField>

        <FormField label="Urgência" fieldId={FIELD_ID.urgency} error={errors.urgency?.message}>
          <Controller
            control={control}
            name="urgency"
            render={({ field }) => (
              <LevelSelect
                id={FIELD_ID.urgency}
                value={field.value}
                onChange={field.onChange}
                hasError={Boolean(errors.urgency)}
              />
            )}
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Cadastrar demanda"}
        </Button>
      </div>
    </form>
  );
}
