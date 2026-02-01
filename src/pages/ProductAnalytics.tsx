import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useProducts } from '@/hooks/useProducts';
import { useSales } from '@/hooks/useSales';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Package, DollarSign, AlertTriangle, BarChart3, Download, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface ProductSalesData {
  productId: string;
  productName: string;
  totalSold: number;
  revenue: number;
  currentStock: number;
  lastSoldDate?: string;
  daysSinceLastSale?: number;
}

export default function ProductAnalytics() {
  const { user } = useAuth();
  const { currentBusiness, isOwner } = useBusiness();
  const { products } = useProducts();
  const { sales } = useSales();
  const [isExporting, setIsExporting] = useState(false);

  if (!user) return <Navigate to="/auth" replace />;
  if (!currentBusiness) return <Navigate to="/" replace />;
  if (!isOwner) return <Navigate to="/" replace />;

  // Calcular datos de ventas por producto
  const productSalesData = useMemo(() => {
    const salesByProduct = new Map<string, ProductSalesData>();

    // Inicializar con todos los productos
    products.forEach(product => {
      salesByProduct.set(product.id, {
        productId: product.id,
        productName: product.name,
        totalSold: 0,
        revenue: 0,
        currentStock: product.stock,
      });
    });

    // Procesar todas las ventas
    sales.forEach(sale => {
      sale.items?.forEach(item => {
        const existing = salesByProduct.get(item.product_id);
        if (existing) {
          existing.totalSold += item.quantity;
          existing.revenue += Number(item.price) * item.quantity;
          
          // Actualizar fecha de última venta
          const saleDate = new Date(sale.created_at);
          if (!existing.lastSoldDate || new Date(existing.lastSoldDate) < saleDate) {
            existing.lastSoldDate = sale.created_at;
          }
        }
      });
    });

    // Calcular días sin vender
    const today = new Date();
    salesByProduct.forEach(data => {
      if (data.lastSoldDate) {
        const lastSale = new Date(data.lastSoldDate);
        data.daysSinceLastSale = Math.floor((today.getTime() - lastSale.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        data.daysSinceLastSale = 999; // Nunca vendido
      }
    });

    return Array.from(salesByProduct.values());
  }, [products, sales]);

  // Top 10 productos más vendidos
  const topSellingProducts = useMemo(() => {
    return [...productSalesData]
      .filter(p => p.totalSold > 0)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 10);
  }, [productSalesData]);

  // Productos con menos ventas o sin movimiento
  const lowSellingProducts = useMemo(() => {
    return [...productSalesData]
      .filter(p => p.currentStock > 0) // Solo productos con stock
      .sort((a, b) => {
        // Ordenar por días sin vender (descendente) y luego por cantidad vendida (ascendente)
        if (a.daysSinceLastSale !== b.daysSinceLastSale) {
          return (b.daysSinceLastSale || 0) - (a.daysSinceLastSale || 0);
        }
        return a.totalSold - b.totalSold;
      })
      .slice(0, 10);
  }, [productSalesData]);

  // Producto estrella (más ingresos)
  const starProduct = useMemo(() => {
    return [...productSalesData]
      .filter(p => p.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)[0];
  }, [productSalesData]);

  // Productos vendidos vs no vendidos
  const productsWithSales = productSalesData.filter(p => p.totalSold > 0).length;
  const productsWithoutSales = productSalesData.filter(p => p.totalSold === 0).length;

  // Valor total del inventario
  const totalInventoryValue = useMemo(() => {
    return products.reduce((sum, product) => {
      return sum + (product.stock * Number(product.price));
    }, 0);
  }, [products]);

  // Productos con stock bajo que se venden bien
  const lowStockBestSellers = useMemo(() => {
    return [...productSalesData]
      .filter(p => {
        const product = products.find(prod => prod.id === p.productId);
        return product && product.stock <= product.min_stock && p.totalSold > 0;
      })
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);
  }, [productSalesData, products]);

  // Función para exportar a PDF
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      // Importar librerías dinámicamente
      const jsPDF = (await import('jspdf')).default;
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Título
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Análisis de Productos', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(currentBusiness?.name || '', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 3;
      doc.text(new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }), pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;

      // Métricas principales
      doc.setFillColor(240, 240, 255);
      doc.rect(15, yPosition, pageWidth - 30, 20, 'F');
      
      yPosition += 7;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Métricas Principales', 20, yPosition);
      
      yPosition += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Valor del inventario: $${totalInventoryValue.toFixed(2)}`, 20, yPosition);
      doc.text(`Total de productos: ${products.length}`, 110, yPosition);
      
      yPosition += 5;
      doc.text(`Con ventas: ${productsWithSales}`, 20, yPosition);
      doc.text(`Sin ventas: ${productsWithoutSales}`, 110, yPosition);
      
      yPosition += 12;

      // Producto Estrella
      if (starProduct) {
        doc.setFillColor(230, 255, 230);
        doc.rect(15, yPosition, pageWidth - 30, 18, 'F');
        
        yPosition += 7;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('⭐ Producto Estrella', 20, yPosition);
        
        yPosition += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(starProduct.productName, 20, yPosition);
        
        yPosition += 5;
        doc.text(`Ingresos: $${starProduct.revenue.toFixed(2)}`, 20, yPosition);
        doc.text(`Unidades vendidas: ${starProduct.totalSold}`, 110, yPosition);
        
        yPosition += 10;
      }

      // Top 10 Más Vendidos
      if (topSellingProducts.length > 0) {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Top 10 Más Vendidos', 20, yPosition);
        yPosition += 7;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        topSellingProducts.forEach((product, index) => {
          if (yPosition > pageHeight - 15) {
            doc.addPage();
            yPosition = 20;
          }
          
          const text = `${index + 1}. ${product.productName}`;
          const truncated = text.length > 45 ? text.substring(0, 45) + '...' : text;
          doc.text(truncated, 20, yPosition);
          doc.text(`${product.totalSold} uds`, 130, yPosition);
          doc.text(`$${product.revenue.toFixed(2)}`, 155, yPosition);
          
          yPosition += 5;
        });
        
        yPosition += 5;
      }

      // Productos con Poco Movimiento
      if (lowSellingProducts.length > 0) {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Productos con Poco Movimiento', 20, yPosition);
        yPosition += 7;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        lowSellingProducts.forEach((product) => {
          if (yPosition > pageHeight - 15) {
            doc.addPage();
            yPosition = 20;
          }
          
          const truncated = product.productName.length > 50 ? 
            product.productName.substring(0, 50) + '...' : 
            product.productName;
          doc.text(truncated, 20, yPosition);
          
          const daysText = product.daysSinceLastSale === 999 ? 
            'Nunca' : 
            `${product.daysSinceLastSale}d`;
          doc.text(daysText, 155, yPosition);
          
          yPosition += 5;
        });
      }

      // Pie de página
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Guardar PDF
      const fileName = `analisis-productos-${currentBusiness?.name?.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success('PDF generado exitosamente');
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error('Error al generar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="page-container">
      <AppHeader title="Análisis de Productos" showBack />
      
      {/* Botón de exportar PDF */}
      <div className="px-4 pt-4">
        <Button 
          onClick={exportToPDF} 
          disabled={isExporting}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exportar a PDF
            </>
          )}
        </Button>
      </div>
      
      <main className="p-4 space-y-4">
        {/* Métricas principales */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Valor inventario</span>
              </div>
              <p className="text-xl font-bold">${totalInventoryValue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{products.length} productos</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs">Con ventas</span>
              </div>
              <p className="text-xl font-bold">{productsWithSales}</p>
              <p className="text-xs text-muted-foreground">{productsWithoutSales} sin ventas</p>
            </CardContent>
          </Card>
        </div>

        {/* Producto estrella */}
        {starProduct && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Producto Estrella
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-lg">{starProduct.productName}</p>
              <div className="flex gap-4 mt-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Ingresos</p>
                  <p className="font-bold text-primary">${starProduct.revenue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Unidades</p>
                  <p className="font-bold">{starProduct.totalSold}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Productos con stock bajo que se venden bien */}
        {lowStockBestSellers.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Stock bajo - Alta demanda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockBestSellers.map((product, index) => {
                  const productData = products.find(p => p.id === product.productId);
                  return (
                    <div key={product.productId} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{product.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {product.currentStock} | Vendidos: {product.totalSold}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-warning border-warning">
                        ¡Reabastecer!
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 10 productos más vendidos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Top 10 Más Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSellingProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay productos vendidos aún
              </p>
            ) : (
              <div className="space-y-2">
                {topSellingProducts.map((product, index) => (
                  <div key={product.productId} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.totalSold} unidades • ${product.revenue.toFixed(2)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0">
                      Stock: {product.currentStock}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Productos con menos ventas / sin movimiento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              Productos con Poco Movimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowSellingProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay productos con stock
              </p>
            ) : (
              <div className="space-y-2">
                {lowSellingProducts.map((product) => (
                  <div key={product.productId} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.daysSinceLastSale === 999 
                          ? 'Nunca vendido' 
                          : `${product.daysSinceLastSale} días sin vender`}
                        {product.totalSold > 0 && ` • ${product.totalSold} vendidos`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline">
                        Stock: {product.currentStock}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen de distribución */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Distribución de Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Con ventas</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600"
                      style={{ width: `${(productsWithSales / products.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{productsWithSales}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sin ventas</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-600"
                      style={{ width: `${(productsWithoutSales / products.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{productsWithoutSales}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Total de productos</span>
                <span className="text-sm font-bold">{products.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
