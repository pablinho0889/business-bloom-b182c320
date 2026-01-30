import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAlerts } from '@/hooks/useAlerts';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Alerts() {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const { alerts, isLoading, markAsRead } = useAlerts();

  if (!user) return <Navigate to="/auth" replace />;
  if (!currentBusiness) return <Navigate to="/" replace />;

  return (
    <div className="page-container">
      <AppHeader title="Alertas" />
      
      <main className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <CheckCircle className="h-12 w-12 text-success mb-4" />
            <h3 className="font-medium">Todo en orden</h3>
            <p className="text-muted-foreground">No hay alertas pendientes</p>
          </div>
        ) : (
          alerts.map(alert => (
            <Card
              key={alert.id}
              className={`transition-opacity ${alert.is_read ? 'opacity-60' : ''} ${
                alert.level === 'critical' ? 'border-destructive/50' : 'border-warning/50'
              }`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle
                  className={`h-5 w-5 mt-0.5 ${
                    alert.level === 'critical' ? 'text-destructive' : 'text-warning'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
                {!alert.is_read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markAsRead.mutate(alert.id)}
                    disabled={markAsRead.isPending}
                  >
                    Marcar leída
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
}
