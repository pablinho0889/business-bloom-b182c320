import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { ProductWithStatus } from '@/hooks/useProducts';

const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  price: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
  stock: z.coerce.number().min(0, 'El stock debe ser mayor o igual a 0'),
  min_stock: z.coerce.number().min(0, 'El stock mínimo debe ser mayor o igual a 0'),
  is_active: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductWithStatus | null;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  isPending: boolean;
}

export default function ProductForm({
  open,
  onOpenChange,
  product,
  onSubmit,
  isPending,
}: ProductFormProps) {
  const isEditing = !!product;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      price: 0,
      stock: 0,
      min_stock: 5,
      is_active: true,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        price: Number(product.price),
        stock: product.stock,
        min_stock: product.min_stock,
        is_active: product.is_active,
      });
    } else {
      form.reset({
        name: '',
        price: 0,
        stock: 0,
        min_stock: 5,
        is_active: true,
      });
    }
  }, [product, form]);

  const handleSubmit = async (values: ProductFormValues) => {
    await onSubmit(values);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nombre del producto" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isEditing && (
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock inicial</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isEditing && (
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end">
                      <FormLabel>Estado</FormLabel>
                      <div className="flex items-center gap-2 h-10">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <span className="text-sm text-muted-foreground">
                          {field.value ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="min_stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock mínimo</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEditing ? (
                  'Guardar'
                ) : (
                  'Crear'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
