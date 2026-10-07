import type { ReactNode } from "react";

import { AlertIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-shimmer rounded-[6px] bg-surface-muted ${className}`} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-14 text-center ${className}`}>
      {icon ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
          {icon}
        </span>
      ) : null}
      <div className="space-y-1">
        <h3 className="text-[14.5px] font-semibold text-ink">{title}</h3>
        {description ? <p className="mx-auto max-w-[420px] text-[12.5px] text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertIcon size={20} />
      </span>
      <div className="space-y-1">
        <h3 className="text-[14.5px] font-semibold text-ink">{title}</h3>
        <p className="mx-auto max-w-[440px] text-[12.5px] text-muted">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-9 w-9 rounded-[10px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-[38%]" />
            <Skeleton className="h-2.5 w-[22%]" />
          </div>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      ))}
    </div>
  );
}
