import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useProducts, ProductWithStatus } from '@/hooks/useProducts';
import { useInventory } from '@/hooks/useInventory';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import ProductCard from '@/components/inventory/ProductCard';
import ProductForm, { ProductFormValues } from '@/components/inventory/ProductForm';
import DeleteProductDialog from '@/components/inventory/DeleteProductDialog';
import InventoryStats from '@/components/inventory/InventoryStats';
import MovementTimeline from '@/components/inventory/MovementTimeline';
import ProductDetailModal from '@/components/inventory/ProductDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Minus, Loader2, BarChart3, Package } from 'lucide-react';
import { useSales } from '@/hooks/useSales';

export default function Inventory() {
  const { user } = useAuth();
  const { currentBusiness, isOwner, isWarehouse } = useBusiness();
  const { products, isLoading, createProduct, updateProduct, deleteProduct } = useProducts();
  const { movements, createMovement } = useInventory();
  const { sales } = useSales();
  
  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithStatus | null>(null);
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithStatus | null>(null);
  
  // Stock adjustment state
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStatus | null>(null);
  const [movementQty, setMovementQty] = useState(1);
  const [movementType, setMovementType] = useState<'entry' | 'exit'>('entry');
  
  // Product detail modal
  const [detailProduct, setDetailProduct] = useState<ProductWithStatus | null>(null);
  
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'stats'>('list');

  if (!user) return <Navigate to="/auth" replace />;
  if (!currentBusiness) return <Navigate to="/" replace />;
  
  if (!isOwner && !isWarehouse) {
    return <Navigate to="/sales" replace />;
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Check if product has sale history
  const productHasSalesHistory = (productId: string): boolean => {
    return sales.some(sale => 
      sale.items?.some(item => item.product_id === productId)
    );
  };

  const handleProductSubmit = async (values: ProductFormValues) => {
    if (editingProduct) {
      await updateProduct.mutateAsync({
        id: editingProduct.id,
        name: values.name,
        price: values.price,
        min_stock: values.min_stock,
        is_active: values.is_active,
      });
    } else {
      await createProduct.mutateAsync({
        name: values.name,
        price: values.price,
        stock: values.stock,
        min_stock: values.min_stock,
      });
    }
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    
    const hasHistory = productHasSalesHistory(productToDelete.id);
    
    if (hasHistory) {
      // Mark as inactive instead of deleting
      await updateProduct.mutateAsync({
        id: productToDelete.id,
        is_active: false,
      });
    } else {
      await deleteProduct.mutateAsync(productToDelete.id);
    }
    
    setShowDeleteDialog(false);
    setProductToDelete(null);
  };

  const handleEdit = (product: ProductWithStatus) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleDelete = (product: ProductWithStatus) => {
    setProductToDelete(product);
    setShowDeleteDialog(true);
  };

  const handleMovement = async () => {
    if (!selectedProduct) return;
    await createMovement.mutateAsync({
      productId: selectedProduct.id,
      type: movementType,
      quantity: movementQty,
    });
    setSelectedProduct(null);
    setMovementQty(1);
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  return (
    <div className="page-container">
      <AppHeader title="Inventario" />
      
      <main className="p-4 space-y-4">
        {/* View Toggle */}
        <div className="flex gap-2">
          <Button
            variant={activeView === 'list' ? 'default' : 'outline'}
            onClick={() => setActiveView('list')}
            className="flex-1"
          >
            <Package className="h-4 w-4 mr-2" />
            Productos
          </Button>
          <Button
            variant={activeView === 'stats' ? 'default' : 'outline'}
            onClick={() => setActiveView('stats')}
            className="flex-1"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Estadísticas
          </Button>
        </div>

        {activeView === 'list' ? (
          <>
            {/* Accordion with Stats */}
            <Accordion type="single" collapsible defaultValue="stats">
              <AccordionItem value="stats" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <span className="font-semibold">Resumen de Inventario</span>
                </AccordionTrigger>
                <AccordionContent>
                  <InventoryStats products={products} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Search and Add */}
            <div className="flex gap-2">
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              {isOwner && (
                <Button onClick={openAddProduct}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Product Tabs */}
            <Tabs defaultValue="all">
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">Todos</TabsTrigger>
                <TabsTrigger value="low" className="flex-1">Bajo</TabsTrigger>
                <TabsTrigger value="out" className="flex-1">Agotado</TabsTrigger>
              </TabsList>

              {['all', 'low', 'out'].map(tab => (
                <TabsContent key={tab} value={tab} className="space-y-2 mt-4">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    filteredProducts
                      .filter(p => {
                        if (tab === 'low') return p.stockStatus === 'low' || p.stockStatus === 'critical';
                        if (tab === 'out') return p.stockStatus === 'out';
                        return true;
                      })
                      .map(product => (
                        <div
                          key={product.id}
                          onClick={() => setDetailProduct(product)}
                          className="cursor-pointer"
                        >
                          <ProductCard
                            product={product}
                            isOwner={isOwner}
                            isWarehouse={isWarehouse}
                            onAdjustStock={() => {
                              setSelectedProduct(product);
                            }}
                            onEdit={() => handleEdit(product)}
                            onDelete={() => handleDelete(product)}
                          />
                        </div>
                      ))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </>
        ) : (
          <div className="space-y-4">
            {/* Stats Overview */}
            <InventoryStats products={products} />

            {/* Movement Timeline */}
            <MovementTimeline movements={movements} isLoading={false} />
          </div>
        )}
      </main>

      {/* Add/Edit Product Form */}
      <ProductForm
        open={showProductForm}
        onOpenChange={(open) => {
          setShowProductForm(open);
          if (!open) setEditingProduct(null);
        }}
        product={editingProduct}
        onSubmit={handleProductSubmit}
        isPending={createProduct.isPending || updateProduct.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteProductDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) setProductToDelete(null);
        }}
        product={productToDelete}
        hasHistory={productToDelete ? productHasSalesHistory(productToDelete.id) : false}
        onConfirm={handleDeleteConfirm}
        isPending={updateProduct.isPending || deleteProduct.isPending}
      />

      {/* Movement Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Stock: {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-center text-muted-foreground">
              Stock actual: <span className="font-bold text-foreground">{selectedProduct?.stock}</span>
            </p>
            <div className="flex justify-center gap-2">
              <Button
                variant={movementType === 'entry' ? 'default' : 'outline'}
                onClick={() => setMovementType('entry')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Entrada
              </Button>
              <Button
                variant={movementType === 'exit' ? 'default' : 'outline'}
                onClick={() => setMovementType('exit')}
              >
                <Minus className="h-4 w-4 mr-2" />
                Salida
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={movementQty}
                onChange={(e) => setMovementQty(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleMovement} disabled={createMovement.isPending}>
              {createMovement.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={detailProduct}
        movements={movements}
        onClose={() => setDetailProduct(null)}
      />

      <BottomNav />
    </div>
  );
}
