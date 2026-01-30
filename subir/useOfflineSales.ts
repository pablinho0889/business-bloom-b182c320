import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type PaymentMethod = Database['public']['Enums']['payment_method'];

export interface PendingSale {
  tempId: string;
  businessId: string;
  userId: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
  total: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  timestamp: number;
}

const STORAGE_KEY = 'pendingSales';

function loadPendingSales(): PendingSale[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePendingSales(sales: PendingSale[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  } catch (error) {
    console.error('Error saving pending sales:', error);
  }
}

export function useOfflineSales() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSales, setPendingSales] = useState<PendingSale[]>(loadPendingSales);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);

  // Update local state and persist
  const updatePendingSales = useCallback((sales: PendingSale[]) => {
    setPendingSales(sales);
    savePendingSales(sales);
  }, []);

  // Add a sale to the pending queue
  const addPendingSale = useCallback((sale: Omit<PendingSale, 'tempId' | 'timestamp'>) => {
    const newSale: PendingSale = {
      ...sale,
      tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    const updated = [...pendingSales, newSale];
    updatePendingSales(updated);
    
    return newSale.tempId;
  }, [pendingSales, updatePendingSales]);

  // Sync a single sale to the server
  const syncSale = async (sale: PendingSale): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('process_sale' as any, {
        p_business_id: sale.businessId,
        p_user_id: sale.userId,
        p_total: sale.total,
        p_payment_method: sale.paymentMethod,
        p_notes: sale.notes || null,
        p_items: sale.items.map(item => ({
          product_id: item.productId,    // Corregido: product_id con guion bajo
          quantity: item.quantity,
          price: item.unitPrice,         // Corregido: price en lugar de unitPrice
        })),
        p_temp_id: sale.tempId,
      });

      if (error) {
        console.error('Error syncing sale:', error);
        return false;
      }

      // La función devuelve un JSONB, verificar el resultado
      const result = data as { success: boolean; sale_id?: string; message?: string; error?: string };
      
      if (!result || !result.success) {
        console.error('Error en respuesta:', result?.error || 'Sin respuesta');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error syncing sale:', error);
      return false;
    }
  };

  // Sync all pending sales
  const syncAllPendingSales = useCallback(async () => {
    if (syncInProgress.current || pendingSales.length === 0 || !navigator.onLine) {
      return;
    }

    syncInProgress.current = true;
    setIsSyncing(true);

    let successCount = 0;
    let failCount = 0;
    const remainingSales: PendingSale[] = [];

    for (const sale of pendingSales) {
      const success = await syncSale(sale);
      if (success) {
        successCount++;
      } else {
        failCount++;
        remainingSales.push(sale);
      }
    }

    updatePendingSales(remainingSales);
    setIsSyncing(false);
    syncInProgress.current = false;

    // Show notifications
    if (successCount > 0 && failCount === 0) {
      toast.success(`${successCount} venta${successCount > 1 ? 's' : ''} sincronizada${successCount > 1 ? 's' : ''} correctamente`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`${successCount} sincronizada${successCount > 1 ? 's' : ''}, ${failCount} pendiente${failCount > 1 ? 's' : ''}`);
    } else if (failCount > 0) {
      toast.error('Error al sincronizar ventas. Se reintentará automáticamente.');
    }
  }, [pendingSales, updatePendingSales]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexión restaurada');
      // Small delay to ensure connection is stable
      setTimeout(() => {
        syncAllPendingSales();
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Sin conexión - Las ventas se guardarán localmente');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Try to sync on mount if online
    if (navigator.onLine && pendingSales.length > 0) {
      syncAllPendingSales();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncAllPendingSales, pendingSales.length]);

  // Clear a specific pending sale (for manual removal if needed)
  const removePendingSale = useCallback((tempId: string) => {
    const updated = pendingSales.filter(s => s.tempId !== tempId);
    updatePendingSales(updated);
  }, [pendingSales, updatePendingSales]);

  return {
  isOnline,
  isSyncing,
  pendingSales,
  pendingCount: pendingSales.length,
  failedCount: 0, // Por ahora sin manejo de fallos
  addPendingSale,
  removePendingSale,
  syncAllPendingSales,
  retryFailedSales: () => {}, // Función vacía por ahora
  clearFailedSales: () => {}, // Función vacía por ahora
};
}
