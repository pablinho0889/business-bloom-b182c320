-- Crear enum para roles de negocio
CREATE TYPE public.business_role AS ENUM ('owner', 'clerk', 'warehouse');

-- Crear enum para tipos de movimiento de inventario
CREATE TYPE public.movement_type AS ENUM ('entry', 'exit', 'sale', 'adjustment');

-- Crear enum para métodos de pago
CREATE TYPE public.payment_method AS ENUM ('cash', 'transfer', 'card');

-- Crear enum para nivel de alerta
CREATE TYPE public.alert_level AS ENUM ('warning', 'critical');

-- ============================================
-- TABLA: Perfiles de usuario
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLA: Negocios
-- ============================================
CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLA: Membresías de usuario a negocio
-- ============================================
CREATE TABLE public.business_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.business_role NOT NULL DEFAULT 'clerk',
    is_active BOOLEAN NOT NULL DEFAULT true,
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(business_id, user_id)
);

-- ============================================
-- TABLA: Categorías de productos
-- ============================================
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLA: Productos
-- ============================================
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    cost DECIMAL(12, 2) DEFAULT 0 CHECK (cost >= 0),
    sku TEXT,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLA: Movimientos de inventario
-- ============================================
CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    type public.movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLA: Ventas
-- ============================================
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    total DECIMAL(12, 2) NOT NULL CHECK (total >= 0),
    payment_method public.payment_method NOT NULL DEFAULT 'cash',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLA: Detalles de venta
-- ============================================
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLA: Alertas
-- ============================================
CREATE TABLE public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    level public.alert_level NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- FUNCIONES HELPER PARA RLS
-- ============================================

-- Verificar si el usuario es miembro de un negocio
CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.business_memberships
        WHERE business_id = p_business_id
        AND user_id = auth.uid()
        AND is_active = true
    );
$$;

-- Verificar si el usuario es dueño de un negocio
CREATE OR REPLACE FUNCTION public.is_business_owner(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.business_memberships
        WHERE business_id = p_business_id
        AND user_id = auth.uid()
        AND role = 'owner'
        AND is_active = true
    );
$$;

-- Verificar si el usuario tiene rol de almacén
CREATE OR REPLACE FUNCTION public.is_business_warehouse(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.business_memberships
        WHERE business_id = p_business_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'warehouse')
        AND is_active = true
    );
$$;

-- Verificar si el usuario tiene rol de dependiente o superior
CREATE OR REPLACE FUNCTION public.is_business_clerk(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.business_memberships
        WHERE business_id = p_business_id
        AND user_id = auth.uid()
        AND is_active = true
    );
$$;

-- ============================================
-- TRIGGER: Crear perfil al registrar usuario
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TRIGGER: Crear membresía de dueño al crear negocio
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_business()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.business_memberships (business_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner');
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_business_created
    AFTER INSERT ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_business();

-- ============================================
-- TRIGGER: Generar alertas de stock
-- ============================================
CREATE OR REPLACE FUNCTION public.check_stock_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Si el stock es 0, crear alerta crítica
    IF NEW.stock = 0 THEN
        INSERT INTO public.alerts (business_id, product_id, level, message)
        VALUES (NEW.business_id, NEW.id, 'critical', 'Producto agotado: ' || NEW.name)
        ON CONFLICT DO NOTHING;
    -- Si el stock está en o bajo el mínimo, crear alerta de advertencia
    ELSIF NEW.stock <= NEW.min_stock THEN
        INSERT INTO public.alerts (business_id, product_id, level, message)
        VALUES (NEW.business_id, NEW.id, 'warning', 'Stock bajo: ' || NEW.name || ' (' || NEW.stock || ' unidades)')
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_stock_changed
    AFTER UPDATE OF stock ON public.products
    FOR EACH ROW
    WHEN (OLD.stock IS DISTINCT FROM NEW.stock)
    EXECUTE FUNCTION public.check_stock_alerts();

-- ============================================
-- TRIGGER: Actualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_business_memberships_updated_at
    BEFORE UPDATE ON public.business_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS: Perfiles
-- ============================================
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS: Negocios
-- ============================================
CREATE POLICY "Users can view businesses they belong to"
    ON public.businesses FOR SELECT
    USING (public.is_business_member(id));

CREATE POLICY "Authenticated users can create businesses"
    ON public.businesses FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their businesses"
    ON public.businesses FOR UPDATE
    USING (public.is_business_owner(id));

-- ============================================
-- POLÍTICAS RLS: Membresías
-- ============================================
CREATE POLICY "Members can view memberships of their businesses"
    ON public.business_memberships FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Owners can manage memberships"
    ON public.business_memberships FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_business_owner(business_id)
        OR (auth.uid() = user_id AND role = 'owner')
    );

CREATE POLICY "Owners can update memberships"
    ON public.business_memberships FOR UPDATE
    USING (public.is_business_owner(business_id));

CREATE POLICY "Owners can delete memberships"
    ON public.business_memberships FOR DELETE
    USING (public.is_business_owner(business_id));

-- ============================================
-- POLÍTICAS RLS: Categorías
-- ============================================
CREATE POLICY "Members can view categories"
    ON public.categories FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Owners can manage categories"
    ON public.categories FOR INSERT
    WITH CHECK (public.is_business_owner(business_id));

CREATE POLICY "Owners can update categories"
    ON public.categories FOR UPDATE
    USING (public.is_business_owner(business_id));

CREATE POLICY "Owners can delete categories"
    ON public.categories FOR DELETE
    USING (public.is_business_owner(business_id));

-- ============================================
-- POLÍTICAS RLS: Productos
-- ============================================
CREATE POLICY "Members can view products"
    ON public.products FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Owners can create products"
    ON public.products FOR INSERT
    WITH CHECK (public.is_business_owner(business_id));

CREATE POLICY "Owners can update products"
    ON public.products FOR UPDATE
    USING (public.is_business_owner(business_id));

CREATE POLICY "Owners can delete products"
    ON public.products FOR DELETE
    USING (public.is_business_owner(business_id));

-- ============================================
-- POLÍTICAS RLS: Movimientos de inventario
-- ============================================
CREATE POLICY "Members can view inventory movements"
    ON public.inventory_movements FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Warehouse and owners can create movements"
    ON public.inventory_movements FOR INSERT
    WITH CHECK (public.is_business_warehouse(business_id));

-- ============================================
-- POLÍTICAS RLS: Ventas
-- ============================================
CREATE POLICY "Members can view sales"
    ON public.sales FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Clerks can create sales"
    ON public.sales FOR INSERT
    WITH CHECK (public.is_business_clerk(business_id) AND auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS: Items de venta
-- ============================================
CREATE POLICY "Members can view sale items"
    ON public.sale_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_id
            AND public.is_business_member(s.business_id)
        )
    );

CREATE POLICY "Clerks can create sale items"
    ON public.sale_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_id
            AND public.is_business_clerk(s.business_id)
        )
    );

-- ============================================
-- POLÍTICAS RLS: Alertas
-- ============================================
CREATE POLICY "Members can view alerts"
    ON public.alerts FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Owners can manage alerts"
    ON public.alerts FOR UPDATE
    USING (public.is_business_owner(business_id));

CREATE POLICY "Owners can delete alerts"
    ON public.alerts FOR DELETE
    USING (public.is_business_owner(business_id));

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX idx_business_memberships_user ON public.business_memberships(user_id);
CREATE INDEX idx_business_memberships_business ON public.business_memberships(business_id);
CREATE INDEX idx_products_business ON public.products(business_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_sales_business ON public.sales(business_id);
CREATE INDEX idx_sales_created ON public.sales(created_at DESC);
CREATE INDEX idx_inventory_movements_business ON public.inventory_movements(business_id);
CREATE INDEX idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX idx_alerts_business ON public.alerts(business_id);
CREATE INDEX idx_alerts_unread ON public.alerts(business_id, is_read) WHERE is_read = false;