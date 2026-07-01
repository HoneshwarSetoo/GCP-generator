'use client';

import { Activity, CheckCircle2, RefreshCw, Server } from 'lucide-react';
import { useCheckHealthQuery } from '@/store/api/gcpApi';
import { Button } from '@/features/ui/button';

function formatUptime(totalSeconds?: number) {
  if (typeof totalSeconds !== 'number') {
    return 'Unknown';
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 1) {
    return `${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 1) {
    return `${minutes}m ${seconds}s`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

export function RenderHealthStatus() {
  const {
    data,
    error,
    isFetching,
    isLoading,
    refetch,
  } = useCheckHealthQuery(undefined, {
    // pollingInterval: 30000,
    // refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const isHealthy = data?.status === 'ok' && !error;
  const isWarming = !data && (isLoading || isFetching || error);
  const statusLabel = isHealthy
    ? 'Backend online'
    : isWarming
      ? 'Backend warming up'
      : 'Checking backend';
  const badgeClass = isHealthy ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200';
  const iconClass = isHealthy ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white';
  const StatusIcon = isHealthy ? CheckCircle2 : isFetching ? RefreshCw : Activity;

  return (
    <div className="group fixed bottom-5 right-5 z-50 flex items-end justify-end">
      <div className="pointer-events-none absolute bottom-14 right-0 w-[min(22rem,calc(100vw-2.5rem))] translate-y-2 opacity-0 shadow-lg transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <div className="rounded-md border border-slate-200 bg-white p-4 text-slate-900 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-slate-100 p-2 text-slate-700">
              <Server className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${badgeClass}`}>
                  <StatusIcon className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                  {statusLabel}
                </span>
                <span className="text-xs text-muted-foreground">Render service</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {data
                  ? `${data.service} - uptime ${formatUptime(data.uptime_seconds)}`
                  : 'Waiting for the /api/health response'}
              </p>
              {data && (
                <div className="grid gap-1 pt-1 text-xs text-muted-foreground">
                  <span className="truncate">Container: {data.container.hostname}</span>
                  <span>Python: {data.container.python}</span>
                  <span className="truncate">GDAL: {data.container.gdal}</span>
                  <span>Service: {data.render.service_name ?? 'local'}</span>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="mt-3"
                leftIcon={<RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void refetch()}
        className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg ring-4 ring-white transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-slate-300 ${iconClass}`}
        aria-label={`${statusLabel}. Refresh backend health status`}
        title={statusLabel}
      >
        <StatusIcon className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
