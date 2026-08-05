"use client";

import type { ReactNode } from "react";

import { ThemeProvider as NextThemeProvider } from "next-themes";

/**
 * Faz a página acompanhar o tema claro ou escuro do sistema.
 *
 * As variantes `dark:` do Tailwind dependem da classe `.dark` em um ancestral
 * (ver `@custom-variant` em `globals.css`), e é este provider que a aplica. Sem
 * ele, o bloco `.dark` do CSS e todas as variantes ficariam inertes.
 *
 * `enableSystem` sem `ThemeToggle` é intencional: a interface segue a
 * preferência do sistema operacional e não oferece um seletor próprio.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  );
}
