import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ProductWithStatus } from '@/hooks/useProducts';

interface Movement {
  id: string;
  type: 'entry' | 'exit';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  created_at: string;
  notes?: string;
}

interface ProductDetailModalProps {
  product: ProductWithStatus | null;
  movements: Movement[];
  onClose: () => void;
}

export default function ProductDetailModal({
  product,
  movements,
  onClose,
}: ProductDetailModalProps) {
  const productMovements = useMemo(() => {
    if (!product) return [];
    // Filtrar movimientos por product_id, no por id del producto
    return movements.filter((m: any) => m.product_id === product.id);
  }, [product, movements]);

  const chartData = useMemo(() => {
    if (!productMovements.length) return [];
    
    // Get last 15 movements for the chart
    const recentMovements = [...productMovements]
      .reverse()
      .slice(-15);
    
    return recentMovements.map((m) => ({
      date: format(new Date(m.created_at), 'dd/MM'),
      stock: m.new_stock,
      time: format(new Date(m.created_at), 'HH:mm'),
    }));
  }, [productMovements]);

  const stats = useMemo(() => {
    const entries = productMovements.filter((m) => m.type === 'entry');
    const exits = productMovements.filter((m) => m.type === 'exit');
    
    return {
      totalMovements: productMovements.length,
      totalEntries: entries.reduce((sum, m) => sum + m.quantity, 0),
      totalExits: exits.reduce((sum, m) => sum + m.quantity, 0),
      lastMovement: productMovements[0],
    };
  }, [productMovements]);

  if (!product) return null;

  const stockValue = product.stock * Number(product.price);

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-4 pr-4">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Stock Actual</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{product.stock}</p>
                    <Badge variant={
                      product.stockStatus === 'ok' ? 'default' :
                      product.stockStatus === 'low' ? 'secondary' :
                      product.stockStatus === 'critical' ? 'destructive' : 'outline'
                    }>
                      {product.stockStatus === 'ok' ? 'Normal' :
                       product.stockStatus === 'low' ? 'Bajo' :
                       product.stockStatus === 'critical' ? 'Crítico' : 'Agotado'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Valor en Stock</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${stockValue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Precio Unitario</p>
                  <p className="text-xl font-bold">
                    ${Number(product.price).toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Stock Mínimo</p>
                  <p className="text-xl font-bold">{product.min_stock || 'No definido'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="movements" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="movements">
                  <Activity className="h-4 w-4 mr-2" />
                  Movimientos
                </TabsTrigger>
                <TabsTrigger value="stats">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Estadísticas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="movements" className="space-y-3">
                {/* Chart */}
                {chartData.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium mb-3">Evolución del Stock</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="date"
                            className="text-xs"
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            className="text-xs"
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="stock"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Movements List */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Últimos Movimientos</p>
                  {productMovements.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No hay movimientos registrados
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {productMovements.slice(0, 20).map((movement) => (
                        <Card key={movement.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {movement.type === 'entry' ? (
                                  <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">
                                    {movement.type === 'entry' ? 'Entrada' : 'Salida'}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {formatDistanceToNow(new Date(movement.created_at), {
                                        addSuffix: true,
                                        locale: es,
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={movement.type === 'entry' ? 'default' : 'destructive'}>
                                  {movement.type === 'entry' ? '+' : '-'}{movement.quantity}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Stock: {movement.new_stock}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="stats" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          Total Entradas
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-green-700">
                        {stats.totalEntries}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <p className="text-sm font-medium text-red-900 dark:text-red-100">
                          Total Salidas
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-red-700">
                        {stats.totalExits}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="col-span-2">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">Total Movimientos</p>
                      </div>
                      <p className="text-2xl font-bold">{stats.totalMovements}</p>
                    </CardContent>
                  </Card>
                </div>

                {stats.lastMovement && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium mb-2">Último Movimiento</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {stats.lastMovement.type === 'entry' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">
                            {stats.lastMovement.type === 'entry' ? 'Entrada' : 'Salida'}
                          </span>
                        </div>
                        <Badge>
                          {stats.lastMovement.type === 'entry' ? '+' : '-'}
                          {stats.lastMovement.quantity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(stats.lastMovement.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
