import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ExportFilters } from '@/components/inventory/ExportMovementsDialog';

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

interface ExportOptions {
  businessName: string;
  movements: Movement[];
  filters: ExportFilters;
}

export function generateMovementsPDF({ businessName, movements, filters }: ExportOptions) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 20;

  // Filter movements
  const filteredMovements = movements.filter(m => {
    const movementDate = new Date(m.created_at);
    const inDateRange = movementDate >= filters.startDate && movementDate <= filters.endDate;
    const matchesType = filters.movementType === 'all' || m.type === filters.movementType;
    const matchesProduct = filters.productIds.length === 0 || filters.productIds.includes(m.product_id);
    
    return inDateRange && matchesType && matchesProduct;
  });

  // Sort movements
  const sortedMovements = [...filteredMovements].sort((a, b) => {
    if (filters.groupBy === 'date') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      // Group by product
      const nameA = a.product?.name || '';
      const nameB = b.product?.name || '';
      return nameA.localeCompare(nameB);
    }
  });

  // === HEADER ===
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(16);
  doc.text('Reporte de Movimientos de Inventario', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateRange = `${format(filters.startDate, 'dd/MM/yyyy', { locale: es })} - ${format(filters.endDate, 'dd/MM/yyyy', { locale: es })}`;
  doc.text(`Período: ${dateRange}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 6;
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;

  // === STATISTICS (if enabled) ===
  if (filters.includeStats && filteredMovements.length > 0) {
    const entries = filteredMovements.filter(m => m.type === 'entry');
    const exits = filteredMovements.filter(m => m.type === 'exit');
    
    const totalEntries = entries.reduce((sum, m) => sum + m.quantity, 0);
    const totalExits = exits.reduce((sum, m) => sum + m.quantity, 0);
    
    doc.setFillColor(240, 240, 240);
    doc.rect(14, yPosition, pageWidth - 28, 25, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen:', 20, yPosition + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total de movimientos: ${filteredMovements.length}`, 20, yPosition + 13);
    doc.text(`Entradas: ${entries.length} (${totalEntries} unidades)`, 20, yPosition + 19);
    doc.text(`Salidas: ${exits.length} (${totalExits} unidades)`, pageWidth / 2 + 10, yPosition + 19);
    
    yPosition += 30;
  }

  // === TABLE ===
  if (sortedMovements.length === 0) {
    doc.setFontSize(12);
    doc.text('No hay movimientos para el período seleccionado.', pageWidth / 2, yPosition + 20, { align: 'center' });
  } else {
    const tableData = sortedMovements.map(m => {
      const typeLabel = m.type === 'entry' ? 'Entrada' : 'Salida';
      const change = m.type === 'entry' ? `+${m.quantity}` : `-${m.quantity}`;
      
      return [
        format(new Date(m.created_at), 'dd/MM/yyyy HH:mm', { locale: es }),
        m.product?.name || 'Desconocido',
        typeLabel,
        change,
        m.previous_stock.toString(),
        m.new_stock.toString(),
        m.notes || '-',
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Stock Anterior', 'Stock Nuevo', 'Notas']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246], // blue-500
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251], // gray-50
      },
      columnStyles: {
        0: { cellWidth: 30 }, // Fecha
        1: { cellWidth: 'auto' }, // Producto
        2: { cellWidth: 20, halign: 'center' }, // Tipo
        3: { cellWidth: 20, halign: 'center' }, // Cantidad
        4: { cellWidth: 20, halign: 'center' }, // Stock Anterior
        5: { cellWidth: 20, halign: 'center' }, // Stock Nuevo
        6: { cellWidth: 'auto' }, // Notas
      },
      // Colorear las celdas de Tipo usando willDrawCell
      willDrawCell: (data) => {
        // Color code the Type column (column index 2)
        if (data.column.index === 2 && data.section === 'body') {
          const movement = sortedMovements[data.row.index];
          if (movement.type === 'entry') {
            data.cell.styles.textColor = [22, 163, 74]; // green-600
          } else {
            data.cell.styles.textColor = [220, 38, 38]; // red-600
          }
        }
      },
      margin: { top: 10, right: 14, bottom: 20, left: 14 },
      didDrawPage: (data) => {
        // Footer with page number
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      },
    });
  }

  // === SAVE PDF ===
  const fileName = `Movimientos_${format(filters.startDate, 'ddMMyyyy')}_${format(filters.endDate, 'ddMMyyyy')}.pdf`;
  doc.save(fileName);
}
