import { useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Plus, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BusinessSelector() {
  const { businesses, setCurrentBusiness, refreshBusinesses } = useBusiness();
  const { signOut, user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    setCreating(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    const { error } = await supabase
      .from('businesses')
      .insert({ name, owner_id: user.id });

    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      toast.success('¡Negocio creado!');
      await refreshBusinesses();
      setShowCreate(false);
    }
    setCreating(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-xl gradient-primary flex items-center justify-center">
            <Store className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle>Seleccionar Negocio</CardTitle>
          <CardDescription>
            {businesses.length > 0
              ? 'Elige el negocio con el que deseas trabajar'
              : 'Crea tu primer negocio para comenzar'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {businesses.map((business) => (
            <Button
              key={business.id}
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => setCurrentBusiness(business)}
            >
              <Store className="h-5 w-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">{business.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{business.role}</p>
              </div>
            </Button>
          ))}

          {showCreate ? (
            <form onSubmit={handleCreate} className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del negocio</Label>
                <Input id="name" name="name" required placeholder="Mi Tienda" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear negocio
            </Button>
          )}

          <Button variant="ghost" className="w-full text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
