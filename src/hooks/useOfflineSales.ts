import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { pendingSalesDB } from '@/lib/offlineDB';
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

export function useOfflineSales() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);

  // Cargar ventas pendientes desde IndexedDB al montar
  useEffect(() => {
    loadPendingSales();
  }, []);

  const loadPendingSales = async () => {
    try {
      const sales = await pendingSalesDB.getAll();
      setPendingSales(sales);
      console.log(`📥 ${sales.length} ventas pendientes cargadas desde IndexedDB`);
    } catch (error) {
      console.error('Error cargando ventas pendientes:', error);
    }
  };

  // Añadir venta a la cola
  const addPendingSale = useCallback(async (sale: Omit<PendingSale, 'tempId' | 'timestamp'>) => {
    const newSale: PendingSale = {
      ...sale,
      tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    try {
      await pendingSalesDB.add(newSale);
      setPendingSales(prev => [...prev, newSale]);
      console.log('💾 Venta guardada en IndexedDB:', newSale.tempId);
      return newSale.tempId;
    } catch (error) {
      console.error('Error guardando venta offline:', error);
      throw error;
    }
  }, []);

  // Sincronizar una venta individual
  const syncSale = async (sale: PendingSale): Promise<boolean> => {
    try {
      console.log('🔄 Sincronizando venta:', sale.tempId);
      
      const { data, error } = await supabase.rpc('process_sale' as any, {
        p_business_id: sale.businessId,
        p_user_id: sale.userId,
        p_total: sale.total,
        p_payment_method: sale.paymentMethod,
        p_notes: sale.notes || null,
        p_items: sale.items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
          price: item.unitPrice,
        })),
        p_temp_id: sale.tempId,
      });

      if (error) {
        console.error('❌ Error sincronizando:', error);
        return false;
      }

      const result = data as { success: boolean; sale_id?: string; message?: string; error?: string };
      
      if (!result || !result.success) {
        console.error('❌ Respuesta inválida:', result?.error || 'Sin respuesta');
        return false;
      }

      console.log('✅ Venta sincronizada exitosamente:', sale.tempId);
      return true;
    } catch (error) {
      console.error('❌ Excepción sincronizando:', error);
      return false;
    }
  };

  // Sincronizar todas las ventas pendientes
  const syncAllPendingSales = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) {
      console.log('⏸️ Sincronización omitida (en progreso o sin conexión)');
      return;
    }

    const salesToSync = await pendingSalesDB.getAll();
    
    if (salesToSync.length === 0) {
      console.log('✅ No hay ventas pendientes para sincronizar');
      return;
    }

    syncInProgress.current = true;
    setIsSyncing(true);
    console.log(`🔄 Iniciando sincronización de ${salesToSync.length} ventas...`);

    let successCount = 0;
    let failCount = 0;

    for (const sale of salesToSync) {
      const success = await syncSale(sale);
      if (success) {
        await pendingSalesDB.remove(sale.tempId);
        successCount++;
      } else {
        failCount++;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    await loadPendingSales();
    setIsSyncing(false);
    syncInProgress.current = false;

    if (successCount > 0 && failCount === 0) {
      toast.success(`${successCount} venta${successCount > 1 ? 's' : ''} sincronizada${successCount > 1 ? 's' : ''} correctamente`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`${successCount} sincronizada${successCount > 1 ? 's' : ''}, ${failCount} pendiente${failCount > 1 ? 's' : ''}`);
    } else if (failCount > 0) {
      toast.error('Error al sincronizar ventas. Se reintentará automáticamente.');
    }

    console.log(`✅ Sincronización completada: ${successCount} éxitos, ${failCount} fallos`);
  }, []);

  // Manejar eventos de conexión
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Conexión restaurada');
      setIsOnline(true);
      toast.success('Conexión restaurada');
      setTimeout(() => syncAllPendingSales(), 1000);
    };

    const handleOffline = () => {
      console.log('📴 Sin conexión');
      setIsOnline(false);
      toast.warning('Sin conexión - Las ventas se guardarán localmente');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine && pendingSales.length > 0) {
      console.log('🔄 Intentando sincronizar ventas pendientes al inicio...');
      setTimeout(() => syncAllPendingSales(), 2000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncAllPendingSales, pendingSales.length]);

  const removePendingSale = useCallback(async (tempId: string) => {
    try {
      await pendingSalesDB.remove(tempId);
      setPendingSales(prev => prev.filter(s => s.tempId !== tempId));
      console.log('🗑️ Venta eliminada:', tempId);
    } catch (error) {
      console.error('Error eliminando venta:', error);
    }
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingSales,
    pendingCount: pendingSales.length,
    failedCount: 0,
    addPendingSale,
    removePendingSale,
    syncAllPendingSales,
    retryFailedSales: () => {},
    clearFailedSales: () => {},
  };
}
