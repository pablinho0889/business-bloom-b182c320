import { useState, useMemo } from 'react';
import { ArrowDown, ArrowUp, Search, Package, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Movement {
  id: string;
  type: 'entry' | 'exit';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  created_at: string;
  notes?: string;
  product?: {
    name: string;
  };
}

interface MovementTimelineProps {
  movements: Movement[];
  isLoading?: boolean;
}

export default function MovementTimeline({ movements, isLoading }: MovementTimelineProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'entry' | 'exit'>('all');

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      const matchesSearch = movement.product?.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || movement.type === filter;
      return matchesSearch && matchesFilter;
    });
  }, [movements, search, filter]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayMovements = movements.filter(m => 
      new Date(m.created_at) >= today
    );

    return {
      totalToday: todayMovements.length,
      entriesTotal: movements.filter(m => m.type === 'entry').length,
      exitsTotal: movements.filter(m => m.type === 'exit').length,
      totalQuantityIn: movements
        .filter(m => m.type === 'entry')
        .reduce((sum, m) => sum + m.quantity, 0),
      totalQuantityOut: movements
        .filter(m => m.type === 'exit')
        .reduce((sum, m) => sum + m.quantity, 0),
    };
  }, [movements]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Cargando movimientos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Movimientos de Inventario</CardTitle>
          <Badge variant="secondary">{stats.totalToday} hoy</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-green-600" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-600 font-medium">Entradas</p>
                <p className="text-lg font-bold text-green-700">{stats.totalQuantityIn}</p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-200 dark:border-red-900">
            <div className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-red-600" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-red-600 font-medium">Salidas</p>
                <p className="text-lg font-bold text-red-700">{stats.totalQuantityOut}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filtros por tipo */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="entry">Entradas</TabsTrigger>
            <TabsTrigger value="exit">Salidas</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {filteredMovements.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {search ? 'No se encontraron movimientos' : 'Sin movimientos registrados'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMovements.map((movement) => (
                    <MovementItem key={movement.id} movement={movement} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function MovementItem({ movement }: { movement: Movement }) {
  const isEntry = movement.type === 'entry';
  const stockChange = isEntry ? movement.quantity : -movement.quantity;
  
  return (
    <div className={`
      relative pl-6 pb-3 border-l-2 last:border-l-0
      ${isEntry ? 'border-green-500' : 'border-red-500'}
    `}>
      {/* Dot indicator */}
      <div className={`
        absolute left-0 top-1 transform -translate-x-1/2
        h-3 w-3 rounded-full
        ${isEntry ? 'bg-green-500' : 'bg-red-500'}
      `} />
      
      <div className="bg-card rounded-lg border p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isEntry ? (
                <ArrowUp className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-600 flex-shrink-0" />
              )}
              <p className="font-medium text-sm truncate">
                {movement.product?.name || 'Producto desconocido'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(movement.created_at), {
                  addSuffix: true,
                  locale: es,
                })}
              </span>
            </div>
          </div>
          <Badge variant={isEntry ? 'default' : 'destructive'} className="flex-shrink-0">
            {stockChange > 0 ? '+' : ''}{stockChange}
          </Badge>
        </div>

        {/* Stock change */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Stock:</span>
          <span className="font-mono">{movement.previous_stock}</span>
          <span className="text-muted-foreground">→</span>
          <span className={`font-mono font-bold ${isEntry ? 'text-green-600' : 'text-red-600'}`}>
            {movement.new_stock}
          </span>
        </div>

        {/* Notes */}
        {movement.notes && (
          <p className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
            {movement.notes}
          </p>
        )}
      </div>
    </div>
  );
}
