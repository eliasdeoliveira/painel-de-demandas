"use client";

import { Trash2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";

interface DeleteDemandButtonProps {
  demandTitle: string;
  onConfirm: () => void;
  disabled?: boolean;
}

/** Remoção é irreversível, então sempre passa por uma confirmação explícita. */
export function DeleteDemandButton({ demandTitle, onConfirm, disabled }: DeleteDemandButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={`Remover demanda ${demandTitle}`}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover demanda</AlertDialogTitle>
          <AlertDialogDescription>
            A demanda &ldquo;{demandTitle}&rdquo; será removida permanentemente. Esta ação não pode
            ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Remover</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
