import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useSales } from '@/hooks/useSales';
import { useProducts } from '@/hooks/useProducts';
import { useAlerts } from '@/hooks/useAlerts';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import BusinessSelector from '@/components/BusinessSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Package, AlertTriangle, TrendingUp, Loader2, ChevronRight } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { currentBusiness, loading: bizLoading, isOwner, isClerk, isWarehouse } = useBusiness();
  const { todayTotal, todaySales, weekSales } = useSales();
  const { products, activeProducts } = useProducts();
  const { unreadCount, criticalAlerts } = useAlerts();

  if (authLoading || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!currentBusiness) {
    return <BusinessSelector />;
  }

  // Redirect non-owners to their appropriate default page
  if (!isOwner) {
    if (isClerk) {
      return <Navigate to="/sales" replace />;
    }
    if (isWarehouse) {
      return <Navigate to="/inventory" replace />;
    }
  }

  const lowStockProducts = products.filter(p => p.stockStatus === 'low' || p.stockStatus === 'critical');
  const outOfStockProducts = products.filter(p => p.stockStatus === 'out');

  return (
    <div className="page-container">
      <AppHeader title="Dashboard" />
      
      <main className="p-4 space-y-4 fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
            onClick={() => navigate('/sales-report?period=today')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Ventas hoy</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold">${todayTotal.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{todaySales.length} ventas</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
            onClick={() => navigate('/sales-report?period=week')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">Esta semana</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold">
                ${weekSales.reduce((s, sale) => s + Number(sale.total), 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">{weekSales.length} ventas</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
            onClick={() => navigate('/products-analytics')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="text-xs">Productos</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold">{activeProducts.length}</p>
              <p className="text-xs text-muted-foreground">{products.length} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Alertas</span>
              </div>
              <p className="text-2xl font-bold">{unreadCount}</p>
              <p className="text-xs text-destructive">{criticalAlerts.length} críticas</p>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4" />
                Stock bajo ({lowStockProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {lowStockProducts.slice(0, 5).map(p => (
                  <span key={p.id} className="text-xs bg-warning/10 text-warning px-2 py-1 rounded">
                    {p.name} ({p.stock})
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Out of Stock */}
        {outOfStockProducts.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Agotados ({outOfStockProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {outOfStockProducts.slice(0, 5).map(p => (
                  <span key={p.id} className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                    {p.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
