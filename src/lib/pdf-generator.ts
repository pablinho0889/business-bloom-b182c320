import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { SaleWithItems } from '@/hooks/useSales';

interface SalesReportData {
  businessName: string;
  period: 'daily' | 'weekly';
  dateRange: string;
  sales: SaleWithItems[];
  totals: {
    totalAmount: number;
    totalSales: number;
    totalProducts: number;
    byPaymentMethod: {
      cash: number;
      card: number;
      transfer: number;
    };
  };
}

const getPaymentMethodLabel = (method: string): string => {
  switch (method) {
    case 'cash': return 'Efectivo';
    case 'card': return 'Tarjeta';
    case 'transfer': return 'Transferencia';
    default: return method;
  }
};

export function generateSalesReportPDF(data: SalesReportData): void {
  const { businessName, period, dateRange, sales, totals } = data;
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(
    period === 'weekly' ? 'Reporte de Ventas Semanal' : 'Reporte de Ventas Diario',
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(dateRange, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 5;
  doc.text(
    `Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );
  
  // Reset color
  doc.setTextColor(0);
  
  // Summary section
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen General', 14, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Summary table
  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Valor']],
    body: [
      ['Total Vendido', `$${totals.totalAmount.toFixed(2)}`],
      ['Número de Ventas', totals.totalSales.toString()],
      ['Productos Vendidos', totals.totalProducts.toString()],
      ['Efectivo', `$${totals.byPaymentMethod.cash.toFixed(2)}`],
      ['Tarjeta', `$${totals.byPaymentMethod.card.toFixed(2)}`],
      ['Transferencia', `$${totals.byPaymentMethod.transfer.toFixed(2)}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  });
  
  // Get final Y position after table
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Sales detail section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle de Ventas', 14, yPos);
  
  yPos += 8;
  
  // Sales table
  const salesTableData = sales.flatMap((sale, saleIndex) => {
    const saleRow = [
      format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm'),
      getPaymentMethodLabel(sale.payment_method),
      `$${Number(sale.total).toFixed(2)}`,
      '', // Product
      '', // Qty
      '', // Unit Price
      '', // Subtotal
    ];
    
    const itemRows = sale.items.map((item, itemIndex) => [
      '', // Date
      '', // Payment
      '', // Total
      item.product_name,
      item.quantity.toString(),
      `$${Number(item.unit_price).toFixed(2)}`,
      `$${Number(item.subtotal).toFixed(2)}`,
    ]);
    
    return [saleRow, ...itemRows];
  });
  
  autoTable(doc, {
    startY: yPos,
    head: [['Fecha/Hora', 'Pago', 'Total', 'Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
    body: salesTableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 25 },
      2: { cellWidth: 22 },
      3: { cellWidth: 45 },
      4: { cellWidth: 15 },
      5: { cellWidth: 25 },
      6: { cellWidth: 22 },
    },
    margin: { left: 14, right: 14 },
    didParseCell: function (data) {
      // Style sale summary rows (those with date)
      if (data.row.index >= 0 && data.section === 'body') {
        const cellText = data.cell.text.join('');
        if (data.column.index === 0 && cellText && cellText.includes('/')) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
        // Also bold the total column for sale rows
        if (data.column.index === 2 && cellText && cellText.startsWith('$')) {
          const rowData = data.row.raw as string[];
          if (rowData[0] && rowData[0].includes('/')) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        }
      }
    },
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      'Reporte generado automáticamente por el sistema de gestión de negocios.',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }
  
  // Save
  const fileName = `ventas_${period === 'weekly' ? 'semana' : 'dia'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
