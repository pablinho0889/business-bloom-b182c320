import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useOfflineSales } from './useOfflineSales';
import { productsDB } from '@/lib/offlineDB';
import type { Database } from '@/integrations/supabase/types';

type Sale = Database['public']['Tables']['sales']['Row'];
type SaleItem = Database['public']['Tables']['sale_items']['Row'];
type PaymentMethod = Database['public']['Enums']['payment_method'];

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
}

export function useSales() {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { 
    isOnline, 
    isSyncing, 
    pendingCount, 
    addPendingSale,
    syncAllPendingSales 
  } = useOfflineSales();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales', currentBusiness?.id],
    queryFn: async () => {
      if (!currentBusiness) return [];

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          items:sale_items(*)
        `)
        .eq('business_id', currentBusiness.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SaleWithItems[];
    },
    enabled: !!currentBusiness,
  });

  const createSale = useMutation({
    mutationFn: async ({
      items,
      paymentMethod,
      notes,
    }: {
      items: CartItem[];
      paymentMethod: PaymentMethod;
      notes?: string;
    }) => {
      console.log('🔍 Estado de conexión:', { isOnline, navigatorOnline: navigator.onLine });
      
      if (!currentBusiness || !user) throw new Error('No business or user');

      const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      // MODO OFFLINE
      if (!isOnline || !navigator.onLine) {
        console.log('📱 Guardando venta offline');
        
        try {
          // 1. Guardar venta en cola (ahora usando IndexedDB)
          const tempId = await addPendingSale({
            businessId: currentBusiness.id,
            userId: user.id,
            items,
            total,
            paymentMethod,
            notes,
          });
          
          // 2. Actualizar stock en IndexedDB
          console.log('📦 Actualizando stock local en IndexedDB...');
          for (const item of items) {
            await productsDB.updateProductStock(item.productId, item.quantity);
          }
          
          // 3. Actualizar stock en React Query para UI inmediata
          queryClient.setQueryData(['products', currentBusiness.id], (oldProducts: any) => {
            if (!oldProducts) return oldProducts;
            
            return oldProducts.map((product: any) => {
              const cartItem = items.find(item => item.productId === product.id);
              if (cartItem) {
                const newStock = product.stock - cartItem.quantity;
                console.log(`✅ Stock UI actualizado: ${product.name} ${product.stock} → ${newStock}`);
                return {
                  ...product,
                  stock: newStock,
                  stockStatus: newStock === 0 ? 'out' : 
                              newStock <= product.min_stock * 0.5 ? 'critical' : 
                              newStock <= product.min_stock ? 'low' : 'normal',
                };
              }
              return product;
            });
          });
          
          console.log('✅ Venta offline procesada completamente');
          return { id: tempId, offline: true };
          
        } catch (error) {
          console.error('❌ Error procesando venta offline:', error);
          throw error;
        }
      }

      // MODO ONLINE
      console.log('🌐 Procesando venta online');

      // Generate a temp_id even for online sales to prevent duplicates on retry
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Use the atomic process_sale function that handles sale creation + stock update
      // ⚠️ CAMBIO IMPORTANTE: Usar product_id (con guion bajo) en lugar de productId
      const { data, error } = await supabase.rpc('process_sale' as any, {
        p_business_id: currentBusiness.id,
        p_user_id: user.id,
        p_total: total,
        p_payment_method: paymentMethod,
        p_notes: notes || null,
        p_items: items.map(item => ({
          product_id: item.productId,    // ✅ CORREGIDO: product_id con guion bajo
          quantity: item.quantity,
          price: item.unitPrice,         // ✅ CORREGIDO: price en lugar de unitPrice
        })),
        p_temp_id: tempId,
      });

      if (error) {
        console.error('Error en process_sale:', error);
        throw error;
      }

      // La función devuelve un JSONB, extraer el sale_id
      const result = data as { success: boolean; sale_id: string; message: string; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Error al procesar la venta');
      }

      return { id: result.sale_id, offline: false };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales', currentBusiness?.id] });
      queryClient.invalidateQueries({ queryKey: ['products', currentBusiness?.id] });
      queryClient.invalidateQueries({ queryKey: ['alerts', currentBusiness?.id] });
      
      if (data.offline) {
        toast.success('Venta guardada localmente (sin conexión)');
      } else {
        toast.success('Venta registrada exitosamente');
      }
    },
    onError: (error) => {
      console.error('Error completo:', error);
      toast.error('Error al registrar venta: ' + error.message);
    },
  });

  // Today's sales
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySales = sales.filter(s => new Date(s.created_at) >= today);
  const todayTotal = todaySales.reduce((sum, s) => sum + Number(s.total), 0);

  // This week's sales
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekSales = sales.filter(s => new Date(s.created_at) >= weekStart);

  return {
    sales,
    todaySales,
    todayTotal,
    weekSales,
    isLoading,
    createSale,
    // Offline support
    isOnline,
    isSyncing,
    pendingCount,
    syncAllPendingSales,
  };
}
