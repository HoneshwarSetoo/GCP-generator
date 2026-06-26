'use client';

import { Activity, CheckCircle2, RefreshCw, Server } from 'lucide-react';
import { useCheckHealthQuery } from '@/store/api/gcpApi';
import { Button } from '@/features/ui/button';
import { Card, CardContent } from '@/features/ui/card';

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
    pollingInterval: 30000,
    refetchOnFocus: true,
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
  const StatusIcon = isHealthy ? CheckCircle2 : isFetching ? RefreshCw : Activity;

  return (
    <Card className="rounded-md border-slate-200 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-md bg-slate-100 p-2 text-slate-700">
            <Server className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-1">
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
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Container: {data.container.hostname}</span>
                <span>Python: {data.container.python}</span>
                <span>GDAL: {data.container.gdal}</span>
                <span>Service: {data.render.service_name ?? 'local'}</span>
              </div>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="w-full shrink-0 md:w-auto"
          leftIcon={<RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
}
