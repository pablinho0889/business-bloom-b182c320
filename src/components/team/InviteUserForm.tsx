import { useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type BusinessRole = Database['public']['Enums']['business_role'];

interface InviteUserFormProps {
  onSuccess: () => void;
}

export default function InviteUserForm({ onSuccess }: InviteUserFormProps) {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<BusinessRole>('clerk');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !user) return;

    setLoading(true);

    try {
      // First, find the user by email in profiles
      // Since we can't query auth.users directly, we need to look up by profile
      // This requires the user to have signed up already
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('full_name', `%${email}%`);

      // For MVP, we'll use a different approach:
      // The owner provides the user_id or we create a pending invitation
      // For now, let's assume the email matches a user_id pattern
      // In production, you'd use an edge function to look up auth.users
      
      // Simplified: Ask for user ID directly or use email lookup
      // Let's try to add by assuming email is actually the user_id for testing
      // or implement proper lookup
      
      // Check if user already in team
      const { data: existingMember } = await supabase
        .from('business_memberships')
        .select('id')
        .eq('business_id', currentBusiness.id)
        .eq('user_id', email)
        .maybeSingle();

      if (existingMember) {
        toast.error('Este usuario ya es miembro del negocio');
        setLoading(false);
        return;
      }

      // Add user to business
      const { error } = await supabase
        .from('business_memberships')
        .insert({
          business_id: currentBusiness.id,
          user_id: email, // In MVP, we use user_id directly
          role,
          invited_by: user.id,
        });

      if (error) {
        if (error.message.includes('user_id')) {
          toast.error('ID de usuario no válido. El usuario debe registrarse primero.');
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      toast.success('Usuario agregado al equipo');
      setEmail('');
      setRole('clerk');
      onSuccess();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error('Error al agregar usuario: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="userId">ID del usuario</Label>
        <Input
          id="userId"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="UUID del usuario registrado"
          required
        />
        <p className="text-xs text-muted-foreground">
          El usuario debe compartir su ID de usuario contigo (visible en Ajustes)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Rol</Label>
        <Select value={role} onValueChange={(v: BusinessRole) => setRole(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="clerk">Dependiente (Ventas)</SelectItem>
            <SelectItem value="warehouse">Almacén (Inventario)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Agregar al equipo'}
      </Button>
    </form>
  );
}
