import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Store, User, Shield } from 'lucide-react';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { currentBusiness, currentRole, setCurrentBusiness } = useBusiness();

  if (!user) return <Navigate to="/auth" replace />;
  if (!currentBusiness) return <Navigate to="/" replace />;

  const roleLabels = {
    owner: 'Dueño',
    clerk: 'Dependiente',
    warehouse: 'Almacén',
  };

  return (
    <div className="page-container">
      <AppHeader title="Configuración" />
      
      <main className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              <span className="text-muted-foreground">Email:</span> {user.email}
            </p>
            <div className="p-2 bg-muted rounded text-xs">
              <p className="text-muted-foreground mb-1">Tu ID de usuario:</p>
              <p className="font-mono break-all select-all">{user.id}</p>
              <p className="text-muted-foreground mt-1 text-[10px]">
                Comparte este ID para ser agregado a otros negocios
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-4 w-4" />
              Negocio actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-medium">{currentBusiness.name}</p>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Rol: {currentRole ? roleLabels[currentRole] : '-'}
              </span>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setCurrentBusiness(null)}>
              Cambiar negocio
            </Button>
          </CardContent>
        </Card>

        <Button variant="destructive" className="w-full" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
