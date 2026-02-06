import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Download, Loader2 } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ProductWithStatus } from '@/hooks/useProducts';

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
  product_id: string;
}

interface ExportMovementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movements: Movement[];
  products: ProductWithStatus[];
  onExport: (filters: ExportFilters) => Promise<void>;
}

export interface ExportFilters {
  startDate: Date;
  endDate: Date;
  movementType: 'all' | 'entry' | 'exit';
  productIds: string[];
  includeStats: boolean;
  groupBy: 'date' | 'product';
}

export default function ExportMovementsDialog({
  open,
  onOpenChange,
  movements,
  products,
  onExport,
}: ExportMovementsDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  
  // Date filters
  const [datePreset, setDatePreset] = useState<'custom' | 'today' | 'week' | 'month' | 'all'>('month');
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  
  // Movement type filter
  const [movementType, setMovementType] = useState<'all' | 'entry' | 'exit'>('all');
  
  // Product filter
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectAllProducts, setSelectAllProducts] = useState(true);
  
  // PDF options
  const [includeStats, setIncludeStats] = useState(true);
  const [groupBy, setGroupBy] = useState<'date' | 'product'>('date');

  // Handle date preset changes
  const handlePresetChange = (preset: typeof datePreset) => {
    setDatePreset(preset);
    const now = new Date();
    
    switch (preset) {
      case 'today':
        setStartDate(startOfDay(now));
        setEndDate(endOfDay(now));
        break;
      case 'week':
        setStartDate(startOfDay(subDays(now, 7)));
        setEndDate(endOfDay(now));
        break;
      case 'month':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'all':
        // Get first movement date or 1 year ago
        const oldestMovement = movements.length > 0 
          ? new Date(movements[movements.length - 1].created_at)
          : subDays(now, 365);
        setStartDate(startOfDay(oldestMovement));
        setEndDate(endOfDay(now));
        break;
    }
  };

  // Handle product selection
  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
    setSelectAllProducts(false);
  };

  const handleSelectAllProducts = (checked: boolean) => {
    setSelectAllProducts(checked);
    if (checked) {
      setSelectedProducts([]);
    }
  };

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const filters: ExportFilters = {
        startDate,
        endDate,
        movementType,
        productIds: selectAllProducts ? [] : selectedProducts,
        includeStats,
        groupBy,
      };
      
      await onExport(filters);
      onOpenChange(false);
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Count filtered movements
  const filteredCount = movements.filter(m => {
    const movementDate = new Date(m.created_at);
    const inDateRange = movementDate >= startDate && movementDate <= endDate;
    const matchesType = movementType === 'all' || m.type === movementType;
    const matchesProduct = selectAllProducts || selectedProducts.includes(m.product_id);
    
    return inDateRange && matchesType && matchesProduct;
  }).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Movimientos a PDF
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <div className="space-y-6">
            {/* Date Range */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Rango de Fechas</Label>
              
              {/* Quick presets */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'today', label: 'Hoy' },
                  { value: 'week', label: 'Última semana' },
                  { value: 'month', label: 'Este mes' },
                  { value: 'all', label: 'Todo' },
                ].map((preset) => (
                  <Button
                    key={preset.value}
                    variant={datePreset === preset.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePresetChange(preset.value as typeof datePreset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              {/* Custom date range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                        onClick={() => setDatePreset('custom')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          if (date) {
                            setStartDate(startOfDay(date));
                            setDatePreset('custom');
                          }
                        }}
                        disabled={(date) => date > endDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                        onClick={() => setDatePreset('custom')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          if (date) {
                            setEndDate(endOfDay(date));
                            setDatePreset('custom');
                          }
                        }}
                        disabled={(date) => date < startDate || date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Movement Type */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Tipo de Movimiento</Label>
              <RadioGroup value={movementType} onValueChange={(value: any) => setMovementType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="type-all" />
                  <Label htmlFor="type-all" className="font-normal cursor-pointer">
                    Todos los movimientos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="entry" id="type-entry" />
                  <Label htmlFor="type-entry" className="font-normal cursor-pointer">
                    Solo entradas
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="exit" id="type-exit" />
                  <Label htmlFor="type-exit" className="font-normal cursor-pointer">
                    Solo salidas
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Product Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Productos</Label>
              
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="select-all"
                  checked={selectAllProducts}
                  onCheckedChange={handleSelectAllProducts}
                />
                <Label htmlFor="select-all" className="font-normal cursor-pointer">
                  Todos los productos
                </Label>
              </div>

              {!selectAllProducts && (
                <ScrollArea className="h-[150px] border rounded-lg p-3">
                  <div className="space-y-2">
                    {products.filter(p => p.is_active).map((product) => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => handleProductToggle(product.id)}
                        />
                        <Label
                          htmlFor={`product-${product.id}`}
                          className="font-normal cursor-pointer flex-1"
                        >
                          {product.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* PDF Options */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Opciones del PDF</Label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-stats"
                    checked={includeStats}
                    onCheckedChange={(checked) => setIncludeStats(checked as boolean)}
                  />
                  <Label htmlFor="include-stats" className="font-normal cursor-pointer">
                    Incluir resumen y estadísticas
                  </Label>
                </div>

                <div className="space-y-2 mt-3">
                  <Label className="text-sm">Agrupar por:</Label>
                  <RadioGroup value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="date" id="group-date" />
                      <Label htmlFor="group-date" className="font-normal cursor-pointer">
                        Fecha (más reciente primero)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="product" id="group-product" />
                      <Label htmlFor="group-product" className="font-normal cursor-pointer">
                        Producto (alfabético)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* Preview/Summary */}
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Vista Previa:</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  📅 <strong>Período:</strong>{' '}
                  {format(startDate, 'dd/MM/yyyy', { locale: es })} -{' '}
                  {format(endDate, 'dd/MM/yyyy', { locale: es })}
                </p>
                <p>
                  📊 <strong>Movimientos a exportar:</strong> {filteredCount}
                </p>
                <p>
                  📦 <strong>Productos:</strong>{' '}
                  {selectAllProducts ? 'Todos' : `${selectedProducts.length} seleccionados`}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isExporting || filteredCount === 0}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF ({filteredCount})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
