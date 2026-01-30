import { useState, useRef, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import QuantityAdjuster from './QuantityAdjuster';
import type { ProductWithStatus } from '@/hooks/useProducts';

interface ProductCardSalesProps {
  product: ProductWithStatus;
  cartQuantity: number;
  onTap: () => void;
  onQuantityChange: (productId: string, newQuantity: number) => void;
}

const LONG_PRESS_DURATION = 400;

export default function ProductCardSales({
  product,
  cartQuantity,
  onTap,
  onQuantityChange,
}: ProductCardSalesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const didLongPress = useRef(false);

  const clearTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(() => {
    didLongPress.current = false;
    setIsPressed(true);
    
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setIsPressed(false);
      if (cartQuantity > 0) {
        setIsOpen(true);
      }
    }, LONG_PRESS_DURATION);
  }, [cartQuantity]);

  const handleTouchEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    clearTimer();
    setIsPressed(false);
    
    if (!didLongPress.current && product.stock > 0) {
      onTap();
    }
    
    // Prevent ghost clicks on touch devices
    if ('touches' in e) {
      e.preventDefault();
    }
  }, [clearTimer, onTap, product.stock]);

  const handleTouchCancel = useCallback(() => {
    clearTimer();
    setIsPressed(false);
    didLongPress.current = false;
  }, [clearTimer]);

  const handleQuantityChange = (newQuantity: number) => {
    onQuantityChange(product.id, newQuantity);
  };

  const handleConfirm = () => {
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchCancel}
          disabled={product.stock === 0}
          className={`
            product-btn relative select-none
            ${cartQuantity > 0 ? 'product-btn-selected' : ''}
            ${product.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}
            ${isPressed ? 'scale-95 shadow-lg ring-2 ring-primary/50' : ''}
            transition-all duration-150
          `}
        >
          <span className="font-medium text-sm line-clamp-2">{product.name}</span>
          <span className="text-lg font-bold text-primary">
            ${Number(product.price).toFixed(2)}
          </span>
          <span className={`stock-badge stock-${product.stockStatus}`}>
            {product.stock} uds
          </span>
          {cartQuantity > 0 && (
            <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
              {cartQuantity}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 border-0 bg-transparent shadow-none"
        side="top"
        align="center"
        sideOffset={8}
      >
        <QuantityAdjuster
          quantity={cartQuantity}
          maxStock={product.stock}
          onQuantityChange={handleQuantityChange}
          onConfirm={handleConfirm}
        />
      </PopoverContent>
    </Popover>
  );
}
