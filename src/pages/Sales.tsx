import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useProducts, ProductWithStatus } from '@/hooks/useProducts';
import { useSales, CartItem } from '@/hooks/useSales';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import ProductCardSales from '@/components/sales/ProductCardSales';
import SyncPanel from '@/components/sales/SyncPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Minus, Plus, ShoppingCart, Trash2, Loader2, CreditCard, Banknote, Smartphone } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type PaymentMethod = Database['public']['Enums']['payment_method'];

export default function Sales() {
  const { user } = useAuth();
  const { currentBusiness, isOwner, isClerk } = useBusiness();
  const { activeProducts, isLoading } = useProducts();
  const { createSale, isOnline, isSyncing, pendingCount, pendingSales, syncAllPendingSales } = useSales();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [search, setSearch] = useState('');
  const [loadingPayment, setLoadingPayment] = useState(false);

  if (!user) return <Navigate to="/auth" replace />;
  if (!currentBusiness) return <Navigate to="/" replace />;
  if (!isOwner && !isClerk) return <Navigate to="/inventory" replace />;

  const filteredProducts = activeProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: ProductWithStatus) => {
    if (product.stock === 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: Number(product.price),
      }];
    });
  };

  const setCartQuantity = (productId: string, newQuantity: number) => {
    const product = activeProducts.find(p => p.id === productId);
    if (!product) return;

    setCart(prev => {
      if (newQuantity <= 0) return prev.filter(item => item.productId !== productId);
      const clampedQuantity = Math.min(newQuantity, product.stock);
      return prev.map(item =>
        item.productId === productId ? { ...item, quantity: clampedQuantity } : item
      );
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const newQty = item.quantity + delta;
      return newQty > 0 ? { ...item, quantity: newQty } : item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const total = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleCheckout = () => {
  if (cart.length === 0) return;

  console.log('🛒 INICIANDO CHECKOUT');
  setLoadingPayment(true);
  
  // Timeout de seguridad: cerrar modal después de 2 segundos si algo falla
  const timeoutId = setTimeout(() => {
    console.log('⏰ Timeout alcanzado, cerrando modal forzadamente');
    setCart([]);
    setShowCheckout(false);
    setLoadingPayment(false);
  }, 2000);
  
  createSale.mutate(
    { items: cart, paymentMethod },
    {
      onSuccess: () => {
        console.log('✅ onSuccess ejecutado');
        clearTimeout(timeoutId);
        setCart([]);
        setShowCheckout(false);
        setLoadingPayment(false);
      },
      onError: (error) => {
        console.error('❌ onError ejecutado:', error);
        clearTimeout(timeoutId);
        setLoadingPayment(false);
      },
    }
  );
};

  return (
    <div className="page-container">
      <AppHeader title="Nueva Venta" />
      
      {/* Panel de sincronización mejorado */}
      <SyncPanel 
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingSales={pendingSales || []}
        onSync={syncAllPendingSales}
      />

      <main className="p-4 space-y-4">
        <Input
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12"
        />

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(product => {
              const cartItem = cart.find(c => c.productId === product.id);
              return (
                <ProductCardSales
                  key={product.id}
                  product={product}
                  cartQuantity={cartItem?.quantity || 0}
                  onTap={() => addToCart(product)}
                  onQuantityChange={setCartQuantity}
                />
              );
            })}
          </div>
        )}

        {cart.length > 0 && (
          <Card className="fixed bottom-20 left-4 right-4 shadow-lg animate-slide-in-bottom">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="font-medium">{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
                </div>
                <span className="text-xl font-bold">${total.toFixed(2)}</span>
              </div>
              <Button className="w-full h-12" onClick={() => setShowCheckout(true)}>
                Cobrar
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Venta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {cart.map(item => (
              <div key={item.productId} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">${item.unitPrice.toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.productId, -1)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.productId, 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.productId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="border-t pt-4">
              <Label className="mb-3 block">Método de pago</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <div className="flex gap-2">
                  <Label className="flex-1 flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="cash" />
                    <Banknote className="h-4 w-4" />
                    Efectivo
                  </Label>
                  <Label className="flex-1 flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="transfer" />
                    <Smartphone className="h-4 w-4" />
                    Transfer
                  </Label>
                  <Label className="flex-1 flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="card" />
                    <CreditCard className="h-4 w-4" />
                    Tarjeta
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-between text-lg font-bold border-t pt-4">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)} disabled={loadingPayment}>
              Cancelar
            </Button>
            <Button onClick={handleCheckout} disabled={loadingPayment}>
              {loadingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Venta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
