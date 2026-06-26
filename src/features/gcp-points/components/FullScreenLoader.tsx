'use client';

interface FullScreenLoaderProps {
  message: string;
}

export function FullScreenLoader({ message }: FullScreenLoaderProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-white/55 px-4 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-md border border-slate-200 bg-white/95 p-6 text-center shadow-xl">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#FF8A4C]" />
          <div className="absolute inset-3 rounded-full bg-[#FF8A4C]/10" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{message}</p>
          <p className="text-xs text-slate-500">Please keep this tab open.</p>
        </div>
      </div>
    </div>
  );
}
