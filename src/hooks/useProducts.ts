import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';
import { productsDB } from '@/lib/offlineDB';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export type StockStatus = 'normal' | 'low' | 'critical' | 'out';

export interface ProductWithStatus extends Product {
  stockStatus: StockStatus;
}

export function getStockStatus(stock: number, minStock: number): StockStatus {
  if (stock === 0) return 'out';
  if (stock <= minStock * 0.5) return 'critical';
  if (stock <= minStock) return 'low';
  return 'normal';
}

export function useProducts() {
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products', currentBusiness?.id],
    queryFn: async () => {
      if (!currentBusiness) return [];

      try {
        // Si estamos online, obtener de Supabase
        if (navigator.onLine) {
          console.log('🌐 Cargando productos desde Supabase...');
          
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .order('name');

          if (error) throw error;

          const productsWithStatus = data.map(product => ({
            ...product,
            stockStatus: getStockStatus(product.stock, product.min_stock),
          })) as ProductWithStatus[];

          // Guardar en IndexedDB para uso offline
          await productsDB.saveProducts(productsWithStatus, currentBusiness.id);
          console.log(`💾 ${productsWithStatus.length} productos guardados en IndexedDB`);

          return productsWithStatus;
        } else {
          // Si estamos offline, cargar desde IndexedDB
          console.log('📴 Modo offline: cargando productos desde IndexedDB...');
          const cachedProducts = await productsDB.getProducts(currentBusiness.id);
          
          if (cachedProducts.length === 0) {
            console.warn('⚠️ No hay productos en caché');
          }
          
          return cachedProducts;
        }
      } catch (error) {
        console.error('❌ Error cargando productos:', error);
        
        // Si falla online, intentar cargar desde caché
        if (navigator.onLine) {
          console.log('🔄 Intentando cargar desde caché como fallback...');
          try {
            const cachedProducts = await productsDB.getProducts(currentBusiness.id);
            if (cachedProducts.length > 0) {
              console.log(`📦 ${cachedProducts.length} productos cargados desde caché (fallback)`);
              return cachedProducts;
            }
          } catch (cacheError) {
            console.error('❌ Error cargando caché:', cacheError);
          }
        }
        
        throw error;
      }
    },
    enabled: !!currentBusiness,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 24 * 60 * 60 * 1000, // 24 horas
    retry: (failureCount, error: any) => {
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
  });

  const createProduct = useMutation({
    mutationFn: async (product: Omit<ProductInsert, 'business_id'>) => {
      if (!currentBusiness) throw new Error('No business selected');

      const { data, error } = await supabase
        .from('products')
        .insert({
          ...product,
          business_id: currentBusiness.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', currentBusiness?.id] });
      toast.success('Producto creado');
    },
    onError: (error) => {
      toast.error('Error al crear producto: ' + error.message);
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: ProductUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', currentBusiness?.id] });
      toast.success('Producto actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar producto: ' + error.message);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', currentBusiness?.id] });
      toast.success('Producto eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar producto: ' + error.message);
    },
  });

  const activeProducts = products.filter(p => p.is_active);

  // Función para limpiar caché
  const clearCache = async () => {
    try {
      if (currentBusiness) {
        // En una versión futura, podríamos añadir deleteProducts a offlineDB
        console.log('🗑️ Limpieza de caché solicitada');
      }
    } catch (error) {
      console.error('Error limpiando caché:', error);
    }
  };

  return {
    products,
    activeProducts,
    isLoading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    clearCache,
  };
}
