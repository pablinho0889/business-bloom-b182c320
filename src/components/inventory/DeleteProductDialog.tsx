import { Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ProductWithStatus } from '@/hooks/useProducts';

interface DeleteProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductWithStatus | null;
  hasHistory: boolean;
  onConfirm: () => Promise<void>;
  isPending: boolean;
}

export default function DeleteProductDialog({
  open,
  onOpenChange,
  product,
  hasHistory,
  onConfirm,
  isPending,
}: DeleteProductDialogProps) {
  if (!product) return null;

  const hasStock = product.stock > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            ¿Eliminar producto?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              ¿Está seguro de eliminar <strong>"{product.name}"</strong>?
            </span>
            
            {hasStock && (
              <span className="block text-amber-600 font-medium">
                ⚠️ Este producto aún tiene {product.stock} unidades en stock.
              </span>
            )}
            
            {hasHistory && (
              <span className="block text-muted-foreground text-sm">
                Este producto tiene historial de ventas, será marcado como inactivo en lugar de eliminarse.
              </span>
            )}
            
            {!hasHistory && (
              <span className="block text-destructive text-sm">
                Esta acción es irreversible.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasHistory ? (
              'Desactivar'
            ) : (
              'Eliminar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
