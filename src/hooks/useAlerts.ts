import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import type { Database } from '@/integrations/supabase/types';

type Alert = Database['public']['Tables']['alerts']['Row'];

export function useAlerts() {
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', currentBusiness?.id],
    queryFn: async () => {
      if (!currentBusiness) return [];

      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Alert[];
    },
    enabled: !!currentBusiness,
  });

  const markAsRead = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', currentBusiness?.id] });
    },
  });

  const unreadAlerts = alerts.filter(a => !a.is_read);
  const criticalAlerts = alerts.filter(a => a.level === 'critical' && !a.is_read);

  return {
    alerts,
    unreadAlerts,
    criticalAlerts,
    unreadCount: unreadAlerts.length,
    isLoading,
    markAsRead,
  };
}
