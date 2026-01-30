import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  CloudOff, 
  Cloud, 
  ShoppingCart, 
  Package, 
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PendingSale } from '@/hooks/useOfflineSales';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SyncPanelProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingSales: PendingSale[];
  onSync: () => void;
}

export default function SyncPanel({ 
  isOnline, 
  isSyncing, 
  pendingSales,
  onSync 
}: SyncPanelProps) {
  const [open, setOpen] = useState(false);
  const pendingCount = pendingSales.length;

  // No mostrar nada si está online y no hay pendientes
  if (isOnline && pendingCount === 0) {
    return null;
  }

  const getTotalPending = () => {
    return pendingSales.reduce((sum, sale) => sum + sale.total, 0);
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
    };
    return labels[method] || method;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant={isOnline ? "secondary" : "destructive"}
          size="sm"
          className={cn(
            "fixed bottom-20 right-4 z-50 shadow-lg transition-all animate-in slide-in-from-bottom-2",
            isSyncing && "opacity-80"
          )}
        >
          {!isOnline ? (
            <CloudOff className="h-4 w-4 mr-2" />
          ) : isSyncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Cloud className="h-4 w-4 mr-2" />
          )}
          
          <span className="text-xs font-medium">
            {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
          </span>
          
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {pendingCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[85vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  {!isOnline ? (
                    <CloudOff className="h-5 w-5 text-destructive" />
                  ) : isSyncing ? (
                    <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                  ) : (
                    <Cloud className="h-5 w-5 text-muted-foreground" />
                  )}
                  Operaciones Pendientes
                </SheetTitle>
                <SheetDescription className="mt-1">
                  {!isOnline ? (
                    <span className="text-destructive font-medium">Sin conexión a internet</span>
                  ) : isSyncing ? (
                    <span className="text-primary font-medium">Sincronizando con el servidor...</span>
                  ) : pendingCount > 0 ? (
                    <span>Hay operaciones esperando sincronización</span>
                  ) : (
                    <span className="text-success">Todo sincronizado correctamente</span>
                  )}
                </SheetDescription>
              </div>

              {/* Botón de sincronizar manual */}
              {isOnline && pendingCount > 0 && (
                <Button
                  onClick={onSync}
                  disabled={isSyncing}
                  size="sm"
                  className="gap-2"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Sincronizar
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Stats */}
            {pendingCount > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Ventas Pendientes
                  </div>
                  <div className="text-2xl font-bold">{pendingCount}</div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    Total Pendiente
                  </div>
                  <div className="text-2xl font-bold">${getTotalPending().toFixed(2)}</div>
                </div>
              </div>
            )}
          </SheetHeader>

          {/* Lista de operaciones */}
          <ScrollArea className="flex-1 px-6">
            {pendingCount === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <CheckCircle2 className="h-16 w-16 text-success mb-4" />
                <h3 className="text-lg font-semibold mb-2">Todo sincronizado</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  No hay operaciones pendientes. Todos tus movimientos están guardados en el servidor.
                </p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                {pendingSales.map((sale, index) => (
                  <div key={sale.tempId}>
                    <div className="bg-card border rounded-lg p-4 space-y-3">
                      {/* Header de la venta */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-lg">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">
                              Venta #{index + 1}
                            </h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {format(new Date(sale.timestamp), "d 'de' MMM, HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-lg">${sale.total.toFixed(2)}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {getPaymentMethodLabel(sale.paymentMethod)}
                          </Badge>
                        </div>
                      </div>

                      <Separator />

                      {/* Items de la venta */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Package className="h-3.5 w-3.5" />
                          <span>{sale.items.length} producto{sale.items.length !== 1 ? 's' : ''}</span>
                        </div>
                        
                        {sale.items.map((item, itemIndex) => (
                          <div 
                            key={itemIndex}
                            className="flex items-center justify-between text-sm bg-muted/50 rounded p-2"
                          >
                            <div className="flex-1">
                              <span className="font-medium">{item.productName}</span>
                              <span className="text-muted-foreground ml-2">
                                x{item.quantity}
                              </span>
                            </div>
                            <span className="font-semibold">
                              ${(item.quantity * item.unitPrice).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Estado */}
                      <div className="flex items-center gap-2 text-xs">
                        {!isOnline ? (
                          <>
                            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                            <span className="text-destructive font-medium">
                              Esperando conexión
                            </span>
                          </>
                        ) : isSyncing ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                            <span className="text-primary font-medium">
                              Sincronizando...
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3.5 w-3.5 text-warning" />
                            <span className="text-warning font-medium">
                              Listo para sincronizar
                            </span>
                          </>
                        )}
                      </div>

                      {sale.notes && (
                        <>
                          <Separator />
                          <p className="text-xs text-muted-foreground italic">
                            Nota: {sale.notes}
                          </p>
                        </>
                      )}
                    </div>

                    {index < pendingSales.length - 1 && (
                      <Separator className="my-3" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer con información */}
          {!isOnline && pendingCount > 0 && (
            <div className="border-t p-4 bg-muted/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-destructive mb-1">
                    Sin conexión a internet
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Estas operaciones se sincronizarán automáticamente cuando vuelva la conexión. 
                    Mientras tanto, están guardadas de forma segura en tu dispositivo.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
