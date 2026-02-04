import { useState } from 'react';
import { Package, Pencil, Trash2, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ProductWithStatus } from '@/hooks/useProducts';

interface ProductCardProps {
  product: ProductWithStatus;
  isOwner: boolean;
  isWarehouse: boolean;
  onAdjustStock: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetail?: () => void;
}

export default function ProductCard({
  product,
  isOwner,
  isWarehouse,
  onAdjustStock,
  onEdit,
  onDelete,
  onViewDetail,
}: ProductCardProps) {
  const [showActions, setShowActions] = useState(false);

  const handleCardClick = () => {
    if (isOwner) {
      setShowActions(!showActions);
    }
  };

  return (
    <Card 
      className={`transition-all ${!product.is_active ? 'opacity-60' : ''} ${isOwner ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{product.name}</p>
                {!product.is_active && (
                  <Badge variant="secondary" className="text-xs">
                    Inactivo
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                ${Number(product.price).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {showActions && isOwner ? (
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                    setShowActions(false);
                  }}
                >
                  <Pencil className="h-5 w-5 text-primary" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setShowActions(false);
                  }}
                >
                  <Trash2 className="h-5 w-5 text-destructive" />
                </Button>
              </div>
            ) : (
              <>
                <span className={`stock-badge stock-${product.stockStatus}`}>
                  {product.stock}
                </span>
                {onViewDetail && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetail();
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {(isOwner || isWarehouse) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdjustStock();
                    }}
                  >
                    Ajustar
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
