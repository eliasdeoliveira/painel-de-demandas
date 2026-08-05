import { describe, expect, it } from "vitest";

import type { DemandSummary } from "@/features/demands/types/demand";
import {
  applyRemovalToSummary,
  applyStatusChangeToSummary,
} from "@/features/demands/utils/summary-changes";

const SUMMARY: DemandSummary = {
  total: 10,
  pending: 4,
  inProgress: 3,
  completed: 2,
  cancelled: 1,
};

describe("applyStatusChangeToSummary", () => {
  it("move a demanda de um contador para o outro", () => {
    const updated = applyStatusChangeToSummary(SUMMARY, "pending", "in_progress");

    expect(updated.pending).toBe(3);
    expect(updated.inProgress).toBe(4);
  });

  it("mantém o total, porque a demanda apenas mudou de estado", () => {
    const updated = applyStatusChangeToSummary(SUMMARY, "pending", "completed");

    expect(updated.total).toBe(10);
  });

  it("não altera nada quando o status é o mesmo", () => {
    expect(applyStatusChangeToSummary(SUMMARY, "pending", "pending")).toBe(SUMMARY);
  });

  it("nunca deixa um contador negativo", () => {
    const zeroed: DemandSummary = { ...SUMMARY, cancelled: 0 };

    expect(applyStatusChangeToSummary(zeroed, "cancelled", "pending").cancelled).toBe(0);
  });

  it("não muta o resumo recebido", () => {
    applyStatusChangeToSummary(SUMMARY, "pending", "completed");

    expect(SUMMARY.pending).toBe(4);
  });
});

describe("applyRemovalToSummary", () => {
  it("desconta do total e do contador do status removido", () => {
    const updated = applyRemovalToSummary(SUMMARY, "completed");

    expect(updated.total).toBe(9);
    expect(updated.completed).toBe(1);
  });

  it("não mexe nos demais contadores", () => {
    const updated = applyRemovalToSummary(SUMMARY, "completed");

    expect(updated.pending).toBe(4);
    expect(updated.inProgress).toBe(3);
  });

  it("nunca deixa um contador negativo", () => {
    const empty: DemandSummary = {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
    };

    const updated = applyRemovalToSummary(empty, "pending");

    expect(updated.total).toBe(0);
    expect(updated.pending).toBe(0);
  });
});
