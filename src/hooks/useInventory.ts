import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type InventoryMovement = Database['public']['Tables']['inventory_movements']['Row'];
type MovementType = Database['public']['Enums']['movement_type'];

export function useInventory() {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['inventory_movements', currentBusiness?.id],
    queryFn: async () => {
      if (!currentBusiness) return [];

      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          product:products(name)
        `)
        .eq('business_id', currentBusiness.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!currentBusiness,
  });

  const createMovement = useMutation({
    mutationFn: async ({
      productId,
      type,
      quantity,
      notes,
    }: {
      productId: string;
      type: MovementType;
      quantity: number;
      notes?: string;
    }) => {
      if (!currentBusiness || !user) throw new Error('No business or user');

      // Get current stock
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const previousStock = product.stock;
      const stockChange = type === 'entry' ? quantity : -quantity;
      const newStock = Math.max(0, previousStock + stockChange);

      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);

      if (updateError) throw updateError;

      // Create movement record
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          business_id: currentBusiness.id,
          product_id: productId,
          user_id: user.id,
          type,
          quantity: Math.abs(quantity),
          previous_stock: previousStock,
          new_stock: newStock,
          notes,
        });

      if (movementError) throw movementError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_movements', currentBusiness?.id] });
      queryClient.invalidateQueries({ queryKey: ['products', currentBusiness?.id] });
      queryClient.invalidateQueries({ queryKey: ['alerts', currentBusiness?.id] });
      toast.success('Movimiento registrado');
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    },
  });

  return {
    movements,
    isLoading,
    createMovement,
  };
}
