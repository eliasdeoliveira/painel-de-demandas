"use client";

import { useState } from "react";

import { PlusIcon } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";

import { DemandForm } from "@/features/demands/components/demand-form";
import { useCreateDemand } from "@/features/demands/hooks/use-demand-mutations";

export function CreateDemandDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const createDemand = useCreateDemand();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="size-4" />
          Nova demanda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova demanda</DialogTitle>
          <DialogDescription>
            A prioridade é calculada pelo servidor a partir do impacto e da urgência informados.
          </DialogDescription>
        </DialogHeader>
        <DemandForm
          isSubmitting={createDemand.isPending}
          onCancel={() => setIsOpen(false)}
          onSubmit={(values) =>
            createDemand.mutate(values, { onSuccess: () => setIsOpen(false) })
          }
        />
      </DialogContent>
    </Dialog>
  );
}
