import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTeam } from '@/hooks/useTeam';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Users, UserPlus, Loader2, Shield, Trash2, Crown } from 'lucide-react';
import InviteUserForm from '@/components/team/InviteUserForm';
import type { Database } from '@/integrations/supabase/types';

type BusinessRole = Database['public']['Enums']['business_role'];

const roleLabels: Record<BusinessRole, string> = {
  owner: 'Dueño',
  clerk: 'Dependiente',
  warehouse: 'Almacén',
};

const roleColors: Record<BusinessRole, string> = {
  owner: 'bg-primary text-primary-foreground',
  clerk: 'bg-secondary text-secondary-foreground',
  warehouse: 'bg-accent text-accent-foreground',
};

export default function Team() {
  const { user, loading: authLoading } = useAuth();
  const { currentBusiness, loading: bizLoading, isOwner } = useBusiness();
  const { members, loading, updateMemberStatus, updateMemberRole, removeMember, refreshMembers } = useTeam();
  const [inviteOpen, setInviteOpen] = useState(false);

  if (authLoading || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!currentBusiness) return <Navigate to="/" replace />;
  
  // Only owners can access team management
  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page-container">
      <AppHeader title="Equipo" />

      <main className="p-4 space-y-4 fade-in">
        {/* Header with invite button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {members.length} miembro{members.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invitar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invitar usuario</DialogTitle>
                <DialogDescription>
                  El usuario debe tener una cuenta registrada. Se agregará al negocio con el rol seleccionado.
                </DialogDescription>
              </DialogHeader>
              <InviteUserForm 
                onSuccess={() => {
                  setInviteOpen(false);
                  refreshMembers();
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Team members list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay miembros en el equipo</p>
              <p className="text-sm text-muted-foreground">Invita a dependientes o personal de almacén</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const isCurrentUser = member.user_id === user.id;
              const isMemberOwner = member.role === 'owner';

              return (
                <Card key={member.id} className={!member.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isMemberOwner && <Crown className="h-4 w-4 text-warning" />}
                          <p className="font-medium truncate">
                            {member.full_name || 'Usuario'}
                          </p>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">Tú</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          ID: {member.user_id.slice(0, 8)}...
                        </p>
                        
                        {/* Role selector - disabled for owners and current user */}
                        <div className="mt-3">
                          {isMemberOwner || isCurrentUser ? (
                            <Badge className={roleColors[member.role]}>
                              {roleLabels[member.role]}
                            </Badge>
                          ) : (
                            <Select
                              value={member.role}
                              onValueChange={(value: BusinessRole) => updateMemberRole(member.id, value)}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="clerk">Dependiente</SelectItem>
                                <SelectItem value="warehouse">Almacén</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>

                      {/* Actions - not for owner or self */}
                      {!isMemberOwner && !isCurrentUser && (
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {member.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                            <Switch
                              checked={member.is_active}
                              onCheckedChange={(checked) => updateMemberStatus(member.id, checked)}
                            />
                          </div>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  El usuario perderá acceso a este negocio. Puedes volver a invitarlo después.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeMember(member.id)}>
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Roles explanation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permisos por rol
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div>
              <span className="font-medium">Dependiente:</span>{' '}
              <span className="text-muted-foreground">Registrar ventas, ver productos</span>
            </div>
            <div>
              <span className="font-medium">Almacén:</span>{' '}
              <span className="text-muted-foreground">Movimientos de inventario, ver stock</span>
            </div>
            <div>
              <span className="font-medium">Dueño:</span>{' '}
              <span className="text-muted-foreground">Acceso total, gestionar equipo</span>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
