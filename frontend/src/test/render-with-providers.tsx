import type { ReactElement, ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

/**
 * Renderiza um componente com os providers de que a aplicação depende.
 *
 * Cada teste ganha um `QueryClient` novo, para que o cache de um não influencie
 * o resultado do outro. As tentativas ficam desligadas: em teste, um erro deve
 * aparecer na primeira falha, sem espera.
 */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return render(ui, { wrapper: Wrapper });
}
