"use client";

import { useState, type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Disponibiliza o cache do TanStack Query para a árvore de componentes.
 *
 * O cliente nasce dentro de um `useState` para que cada montagem tenha o seu
 * próprio cache: no App Router, um cliente criado no escopo do módulo seria
 * compartilhado entre requisições no servidor.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
