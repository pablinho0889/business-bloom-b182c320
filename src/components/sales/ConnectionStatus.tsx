import { Wifi, WifiOff, Cloud, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
}

export default function ConnectionStatus({ isOnline, isSyncing, pendingCount }: ConnectionStatusProps) {
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null; // Don't show anything when everything is fine
  }

  return (
    <div
      className={cn(
        'fixed top-16 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium shadow-lg transition-all animate-in slide-in-from-top-2',
        isOnline 
          ? isSyncing 
            ? 'bg-primary text-primary-foreground' 
            : pendingCount > 0 
              ? 'bg-accent text-accent-foreground'
              : 'bg-secondary text-secondary-foreground'
          : 'bg-destructive text-destructive-foreground'
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>Sin conexión</span>
          {pendingCount > 0 && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Sincronizando...</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5" />
          <span>Conectado</span>
        </>
      )}
    </div>
  );
}
