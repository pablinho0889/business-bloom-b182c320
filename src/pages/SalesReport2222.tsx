import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useSales, SaleWithItems } from '@/hooks/useSales';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, FileDown, Loader2, Banknote, CreditCard, Smartphone, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateSalesReportPDF } from '@/lib/pdf-generator';

type PaymentMethodFilter = 'all' | 'cash' | 'card' | 'transfer';
type TimePeriod = 'week' | 'month' | 'year' | 'all';

export default function SalesReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentBusiness, isOwner } = useBusiness();
  const { sales, isLoading } = useSales();
  
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethodFilter>('all');

  // Función para obtener la fecha de inicio según el período
  const getStartDate = (period: TimePeriod): Date | null => {
    const now = new Date();
    
    switch (period) {
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
      
      case 'month':
        const monthStart = new Date(now);
        monthStart.setMonth(now.getMonth() - 1);
        monthStart.setHours(0, 0, 0, 0);
        return monthStart;
      
      case 'year':
        const yearStart = new Date(now);
        yearStart.setFullYear(now.getFullYear() - 1);
        yearStart.setHours(0, 0, 0, 0);
        return yearStart;
      
      case 'all':
      default:
        return null; // Sin filtro de fecha
    }
  };

  // Filter sales by period
  const filteredSales = useMemo(() => {
    if (!currentBusiness) return [];
    
    const startDate = getStartDate(timePeriod);
    
    // Filtrar por fecha si hay período seleccionado
    let result = startDate 
      ? sales.filter(sale => new Date(sale.created_at) >= startDate)
      : sales;

    // Payment method filter
    if (paymentFilter !== 'all') {
      result = result.filter(sale => sale.payment_method === paymentFilter);
    }

    // Ordenar por tiempo (más reciente primero)
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return result;
  }, [sales, timePeriod, paymentFilter, currentBusiness]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalAmount = filteredSales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const totalProducts = filteredSales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    const byPaymentMethod = {
      cash: filteredSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total), 0),
      card: filteredSales.filter(s => s.payment_method === 'card').reduce((sum, s) => sum + Number(s.total), 0),
      transfer: filteredSales.filter(s => s.payment_method === 'transfer').reduce((sum, s) => sum + Number(s.total), 0),
    };

    return { totalAmount, totalProducts, totalSales: filteredSales.length, byPaymentMethod };
  }, [filteredSales]);

  // Early returns after all hooks
  if (!user) return <Navigate to="/auth" replace />;
  if (!currentBusiness) return <Navigate to="/" replace />;

  // Obtener título según el período
  const getPeriodTitle = () => {
    switch (timePeriod) {
      case 'week': return 'Ventas de la Semana';
      case 'month': return 'Ventas del Mes';
      case 'year': return 'Ventas del Año';
      case 'all': return 'Historial de Ventas';
      default: return 'Ventas';
    }
  };

  const getDateRange = () => {
    const startDate = getStartDate(timePeriod);
    const now = new Date();
    
    if (!startDate) {
      // Para "Todo", mostrar desde la venta más antigua
      if (filteredSales.length > 0) {
        const oldestSale = filteredSales[filteredSales.length - 1];
        return `${format(new Date(oldestSale.created_at), "d 'De' MMMM", { locale: es })} - ${format(now, "d 'De' MMMM, yyyy", { locale: es })}`;
      }
      return 'Sin ventas registradas';
    }
    
    return `${format(startDate, "d 'De' MMMM", { locale: es })} - ${format(now, "d 'De' MMMM, yyyy", { locale: es })}`;
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'transfer': return <Smartphone className="h-4 w-4" />;
      default: return null;
    }
  };

  const handleExportPDF = () => {
    const periodMap = {
      week: 'weekly' as const,
      month: 'monthly' as const,
      year: 'yearly' as const,
      all: 'all-time' as const,
    };
    
    generateSalesReportPDF({
      businessName: currentBusiness.name,
      period: periodMap[timePeriod],
      dateRange: getDateRange(),
      sales: filteredSales,
      totals,
    });
  };

  return (
    <div className="page-container">
      <AppHeader title={getPeriodTitle()} />
      
      <main className="p-4 space-y-4 pb-24">
        {/* Back button and title */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-lg font-bold">{getPeriodTitle()}</h2>
            <p className="text-sm text-muted-foreground capitalize">{getDateRange()}</p>
          </div>
        </div>

        {/* Selector de período */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Período de análisis</span>
            </div>
            <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="week" className="text-xs">Semana</TabsTrigger>
                <TabsTrigger value="month" className="text-xs">Mes</TabsTrigger>
                <TabsTrigger value="year" className="text-xs">Año</TabsTrigger>
                <TabsTrigger value="all" className="text-xs">Todo</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Filtro de método de pago (solo este, sin el de hora) */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrar por método de pago</span>
            </div>
            <Tabs value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentMethodFilter)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
                <TabsTrigger value="cash" className="text-xs">Efectivo</TabsTrigger>
                <TabsTrigger value="card" className="text-xs">Tarjeta</TabsTrigger>
                <TabsTrigger value="transfer" className="text-xs">Transfer</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total vendido</p>
              <p className="text-2xl font-bold">${totals.totalAmount.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Número de ventas</p>
              <p className="text-2xl font-bold">{totals.totalSales}</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Por método de pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Efectivo</span>
              </div>
              <span className="font-medium">${totals.byPaymentMethod.cash.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span>Tarjeta</span>
              </div>
              <span className="font-medium">${totals.byPaymentMethod.card.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span>Transferencia</span>
              </div>
              <span className="font-medium">${totals.byPaymentMethod.transfer.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Sales List */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Detalle de ventas ({filteredSales.length})</h3>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredSales.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No hay ventas para este período
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filteredSales.map((sale) => (
                <AccordionItem key={sale.id} value={sale.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(sale.created_at), 'HH:mm')}
                        </div>
                        <div className="flex items-center gap-1">
                          {getPaymentIcon(sale.payment_method)}
                        </div>
                      </div>
                      <span className="font-bold">${Number(sale.total).toFixed(2)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div className="space-y-2 pt-2 border-t">
                      {sale.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <div>
                            <span className="font-medium">{item.product_name}</span>
                            <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                          </div>
                          <span>${Number(item.subtotal).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        {/* Export Button - Fixed at bottom */}
        {isOwner && filteredSales.length > 0 && (
          <div className="fixed bottom-20 left-4 right-4">
            <Button className="w-full h-12 shadow-lg" onClick={handleExportPDF}>
              <FileDown className="h-5 w-5 mr-2" />
              Exportar PDF
            </Button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
