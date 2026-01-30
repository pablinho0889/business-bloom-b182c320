import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Check } from 'lucide-react';

interface QuantityAdjusterProps {
  quantity: number;
  maxStock: number;
  onQuantityChange: (newQuantity: number) => void;
  onConfirm: () => void;
}

export default function QuantityAdjuster({
  quantity,
  maxStock,
  onQuantityChange,
  onConfirm,
}: QuantityAdjusterProps) {
  const [inputValue, setInputValue] = useState(quantity.toString());

  useEffect(() => {
    setInputValue(quantity.toString());
  }, [quantity]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0 && num <= maxStock) {
      onQuantityChange(num);
    }
  };

  const handleBlur = () => {
    const num = parseInt(inputValue, 10);
    if (isNaN(num) || num < 0) {
      setInputValue('0');
      onQuantityChange(0);
    } else if (num > maxStock) {
      setInputValue(maxStock.toString());
      onQuantityChange(maxStock);
    }
  };

  const decrement = () => {
    const newQty = Math.max(0, quantity - 1);
    onQuantityChange(newQty);
  };

  const increment = () => {
    const newQty = Math.min(maxStock, quantity + 1);
    onQuantityChange(newQty);
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-card rounded-lg shadow-lg border animate-scale-in">
      <Button
        size="icon"
        variant="outline"
        className="h-10 w-10 rounded-full"
        onClick={decrement}
        disabled={quantity <= 0}
      >
        <Minus className="h-4 w-4" />
      </Button>
      
      <Input
        type="number"
        min={0}
        max={maxStock}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onBlur={handleBlur}
        className="w-16 h-10 text-center text-lg font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      
      <Button
        size="icon"
        variant="outline"
        className="h-10 w-10 rounded-full"
        onClick={increment}
        disabled={quantity >= maxStock}
      >
        <Plus className="h-4 w-4" />
      </Button>
      
      <Button
        size="icon"
        className="h-10 w-10 rounded-full"
        onClick={onConfirm}
      >
        <Check className="h-4 w-4" />
      </Button>
    </div>
  );
}
