import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type BusinessRole = Database['public']['Enums']['business_role'];

interface TeamMember {
  id: string;
  user_id: string;
  role: BusinessRole;
  is_active: boolean;
  created_at: string;
  email: string;
  full_name: string | null;
}

export function useTeam() {
  const { currentBusiness, isOwner } = useBusiness();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    if (!currentBusiness || !isOwner) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch memberships with profile data
      const { data, error } = await supabase
        .from('business_memberships')
        .select(`
          id,
          user_id,
          role,
          is_active,
          created_at
        `)
        .eq('business_id', currentBusiness.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each member
      const userIds = data?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Get auth emails via RPC or use profile data
      // For now, we'll display what we have
      const membersWithProfiles: TeamMember[] = (data || []).map(m => {
        const profile = profiles?.find(p => p.user_id === m.user_id);
        return {
          ...m,
          email: '', // We'll show user_id partial
          full_name: profile?.full_name || null,
        };
      });

      setMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [currentBusiness?.id, isOwner]);

  const updateMemberStatus = async (membershipId: string, isActive: boolean) => {
    if (!isOwner) {
      toast.error('Solo el dueño puede modificar usuarios');
      return false;
    }

    try {
      const { error } = await supabase
        .from('business_memberships')
        .update({ is_active: isActive })
        .eq('id', membershipId);

      if (error) throw error;

      toast.success(isActive ? 'Usuario activado' : 'Usuario desactivado');
      await fetchMembers();
      return true;
    } catch (error: any) {
      toast.error('Error: ' + error.message);
      return false;
    }
  };

  const updateMemberRole = async (membershipId: string, role: BusinessRole) => {
    if (!isOwner) {
      toast.error('Solo el dueño puede modificar roles');
      return false;
    }

    try {
      const { error } = await supabase
        .from('business_memberships')
        .update({ role })
        .eq('id', membershipId);

      if (error) throw error;

      toast.success('Rol actualizado');
      await fetchMembers();
      return true;
    } catch (error: any) {
      toast.error('Error: ' + error.message);
      return false;
    }
  };

  const removeMember = async (membershipId: string) => {
    if (!isOwner) {
      toast.error('Solo el dueño puede eliminar usuarios');
      return false;
    }

    try {
      const { error } = await supabase
        .from('business_memberships')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;

      toast.success('Usuario eliminado del negocio');
      await fetchMembers();
      return true;
    } catch (error: any) {
      toast.error('Error: ' + error.message);
      return false;
    }
  };

  return {
    members,
    loading,
    refreshMembers: fetchMembers,
    updateMemberStatus,
    updateMemberRole,
    removeMember,
  };
}
