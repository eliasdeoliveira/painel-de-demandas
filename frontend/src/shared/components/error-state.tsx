import { TriangleAlertIcon } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

/** Estado exibido quando uma requisição falha, sempre com uma saída para o usuário. */
export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 px-6 py-16 text-center"
    >
      <TriangleAlertIcon className="size-10 text-destructive" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
