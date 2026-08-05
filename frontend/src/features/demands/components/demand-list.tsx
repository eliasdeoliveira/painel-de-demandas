"use client";

import { DemandCard } from "@/features/demands/components/demand-card";
import { DemandTable } from "@/features/demands/components/demand-table";
import type { Demand, DemandStatus } from "@/features/demands/types/demand";

interface DemandListProps {
  demands: Demand[];
  onStatusChange: (demand: Demand, status: DemandStatus) => void;
  onDelete: (demand: Demand) => void;
  isBusy: boolean;
}

/**
 * Escolhe a apresentação da lista conforme a largura da tela.
 *
 * A troca é feita por CSS, e não por JavaScript, para não depender de medir a
 * janela: no servidor não há largura, e uma decisão em tempo de execução
 * causaria diferença entre o HTML renderizado e o hidratado. As duas versões
 * consomem os mesmos dados e reaproveitam os mesmos componentes de status,
 * prioridade e ações — só o arranjo muda.
 */
export function DemandList({ demands, onStatusChange, onDelete, isBusy }: DemandListProps) {
  return (
    <>
      <ul className="divide-y md:hidden">
        {demands.map((demand) => (
          <DemandCard
            key={demand.id}
            demand={demand}
            isBusy={isBusy}
            onStatusChange={(status) => onStatusChange(demand, status)}
            onDelete={() => onDelete(demand)}
          />
        ))}
      </ul>

      <div className="hidden md:block">
        <DemandTable
          demands={demands}
          isBusy={isBusy}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      </div>
    </>
  );
}
