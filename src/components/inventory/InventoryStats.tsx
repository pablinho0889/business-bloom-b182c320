import { Package, TrendingDown, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { ProductWithStatus } from '@/hooks/useProducts';

interface InventoryStatsProps {
  products: ProductWithStatus[];
}

export default function InventoryStats({ products }: InventoryStatsProps) {
  const activeProducts = products.filter(p => p.is_active);
  
  const stats = {
    total: activeProducts.length,
    low: activeProducts.filter(p => p.stockStatus === 'low').length,
    critical: activeProducts.filter(p => p.stockStatus === 'critical').length,
    out: activeProducts.filter(p => p.stockStatus === 'out').length,
    totalValue: activeProducts.reduce((sum, p) => sum + (p.stock * Number(p.price)), 0),
  };

  const statCards = [
    {
      label: 'Total Productos',
      value: stats.total,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Stock Bajo',
      value: stats.low,
      icon: TrendingDown,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      label: 'Crítico',
      value: stats.critical,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      label: 'Agotado',
      value: stats.out,
      icon: XCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Valor Total del Inventario */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Total Inventario</p>
              <p className="text-2xl font-bold text-primary">
                ${stats.totalValue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de estadísticas */}
      <div className="grid grid-cols-2 gap-2">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-lg font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
