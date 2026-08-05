"use client";

import { useEffect, useState } from "react";

/**
 * Adia a propagação de um valor até que ele fique estável pelo tempo informado.
 *
 * Usado no campo de busca para não disparar uma requisição por tecla digitada.
 */
export function useDebouncedValue<TValue>(value: TValue, delayInMilliseconds = 400): TValue {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayInMilliseconds);
    return () => clearTimeout(timeoutId);
  }, [value, delayInMilliseconds]);

  return debouncedValue;
}
