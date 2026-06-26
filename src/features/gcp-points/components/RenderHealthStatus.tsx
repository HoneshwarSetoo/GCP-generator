'use client';

import { Activity, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
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
    refetch,
  } = useCheckHealthQuery(undefined, {
    pollingInterval: 30000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const isHealthy = data?.status === 'ok' && !error;
  const statusLabel = isHealthy ? 'Render backend online' : error ? 'Backend unreachable' : 'Checking backend';
  const statusClass = isHealthy ? 'text-emerald-700' : error ? 'text-red-700' : 'text-amber-700';
  const StatusIcon = isHealthy ? CheckCircle2 : error ? AlertCircle : Activity;

  return (
    <Card className="rounded-md">
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-muted p-2">
            <StatusIcon className={`h-4 w-4 ${statusClass}`} />
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${statusClass}`}>{statusLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data
                ? `${data.service} - uptime ${formatUptime(data.uptime_seconds)}`
                : 'Waiting for /api/health response'}
            </p>
            {data && (
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                <span>Container: {data.container.hostname}</span>
                <span>Python: {data.container.python}</span>
                <span>GDAL: {data.container.gdal}</span>
                <span>Render: {data.render.service_name ?? 'local'}</span>
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
          leftIcon={<RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
}
