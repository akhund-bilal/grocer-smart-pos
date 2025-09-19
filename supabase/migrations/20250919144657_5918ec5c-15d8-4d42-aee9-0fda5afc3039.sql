-- Create enum types for roles and payment methods
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'cashier', 'inventory_staff');
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'digital_wallet');
CREATE TYPE public.stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock', 'over_stock');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  role user_role NOT NULL DEFAULT 'cashier',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table for inventory management
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  barcode TEXT UNIQUE,
  category_id UUID REFERENCES public.categories(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock_threshold INTEGER NOT NULL DEFAULT 10,
  max_stock_threshold INTEGER NOT NULL DEFAULT 1000,
  unit TEXT NOT NULL DEFAULT 'pcs',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table for transaction records
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL,
  payment_received DECIMAL(10,2) NOT NULL DEFAULT 0,
  change_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  cashier_id UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sale_items table for items in each sale
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table for business expense tracking
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  approved_by UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock_movements table for inventory tracking
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id),
  movement_type TEXT NOT NULL, -- 'in', 'out', 'adjustment'
  quantity INTEGER NOT NULL,
  reference_type TEXT, -- 'sale', 'purchase', 'adjustment'
  reference_id UUID,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID DEFAULT auth.uid())
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = $1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- Create security definer function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() = required_role OR public.get_user_role() = 'admin';
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role('admin'));

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.has_role('admin'));

-- Create RLS policies for categories
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage categories" ON public.categories
  FOR ALL USING (public.has_role('admin') OR public.has_role('manager'));

-- Create RLS policies for suppliers
CREATE POLICY "Anyone can view suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage suppliers" ON public.suppliers
  FOR ALL USING (public.has_role('admin') OR public.has_role('manager'));

-- Create RLS policies for products
CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Inventory staff can manage products" ON public.products
  FOR ALL USING (
    public.has_role('admin') OR 
    public.has_role('manager') OR 
    public.has_role('inventory_staff')
  );

-- Create RLS policies for sales
CREATE POLICY "Users can view their own sales" ON public.sales
  FOR SELECT USING (cashier_id = auth.uid());

CREATE POLICY "Admins and managers can view all sales" ON public.sales
  FOR SELECT USING (public.has_role('admin') OR public.has_role('manager'));

CREATE POLICY "Cashiers can create sales" ON public.sales
  FOR INSERT WITH CHECK (cashier_id = auth.uid());

-- Create RLS policies for sale_items
CREATE POLICY "Users can view sale items for their sales" ON public.sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales 
      WHERE sales.id = sale_items.sale_id 
      AND sales.cashier_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can view all sale items" ON public.sale_items
  FOR SELECT USING (public.has_role('admin') OR public.has_role('manager'));

CREATE POLICY "Cashiers can create sale items" ON public.sale_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales 
      WHERE sales.id = sale_items.sale_id 
      AND sales.cashier_id = auth.uid()
    )
  );

-- Create RLS policies for expenses
CREATE POLICY "Users can view their own expenses" ON public.expenses
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Admins and managers can view all expenses" ON public.expenses
  FOR SELECT USING (public.has_role('admin') OR public.has_role('manager'));

CREATE POLICY "Anyone can create expenses" ON public.expenses
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Create RLS policies for stock_movements
CREATE POLICY "Anyone can view stock movements" ON public.stock_movements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inventory staff can create stock movements" ON public.stock_movements
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND (
      public.has_role('admin') OR 
      public.has_role('manager') OR 
      public.has_role('inventory_staff') OR
      public.has_role('cashier')
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'cashier')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to get stock status
CREATE OR REPLACE FUNCTION public.get_stock_status(product_id UUID)
RETURNS stock_status AS $$
DECLARE
  product_record RECORD;
BEGIN
  SELECT current_stock, min_stock_threshold, max_stock_threshold
  INTO product_record
  FROM public.products
  WHERE id = product_id;

  IF product_record.current_stock = 0 THEN
    RETURN 'out_of_stock';
  ELSIF product_record.current_stock <= product_record.min_stock_threshold THEN
    RETURN 'low_stock';
  ELSIF product_record.current_stock >= product_record.max_stock_threshold THEN
    RETURN 'over_stock';
  ELSE
    RETURN 'in_stock';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Create function to update product stock
CREATE OR REPLACE FUNCTION public.update_product_stock(
  product_id UUID,
  quantity_change INTEGER,
  movement_type TEXT,
  reference_type TEXT DEFAULT NULL,
  reference_id UUID DEFAULT NULL,
  notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update product stock
  UPDATE public.products
  SET current_stock = current_stock + quantity_change
  WHERE id = product_id;

  -- Record stock movement
  INSERT INTO public.stock_movements (
    product_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    notes,
    created_by
  ) VALUES (
    product_id,
    movement_type,
    ABS(quantity_change),
    reference_type,
    reference_id,
    notes,
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to generate sale number
CREATE OR REPLACE FUNCTION public.generate_sale_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.sales
  WHERE sale_number LIKE 'POS%';

  formatted_number := 'POS' || LPAD(next_number::TEXT, 6, '0');
  RETURN formatted_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Insert some default categories
INSERT INTO public.categories (name, description) VALUES
  ('Fruits & Vegetables', 'Fresh fruits and vegetables'),
  ('Dairy & Eggs', 'Milk, cheese, yogurt, eggs'),
  ('Meat & Seafood', 'Fresh meat and seafood'),
  ('Bakery', 'Bread, cakes, pastries'),
  ('Pantry Staples', 'Rice, flour, oil, spices'),
  ('Beverages', 'Soft drinks, juices, water'),
  ('Snacks', 'Chips, cookies, candy'),
  ('Personal Care', 'Soap, shampoo, toothpaste'),
  ('Household', 'Cleaning supplies, paper products');

-- Insert some sample products
INSERT INTO public.products (name, description, barcode, category_id, unit_price, cost_price, current_stock, min_stock_threshold, max_stock_threshold, unit) VALUES
  ('Bananas', 'Fresh yellow bananas', '1234567890123', (SELECT id FROM public.categories WHERE name = 'Fruits & Vegetables'), 2.50, 1.50, 50, 10, 200, 'kg'),
  ('Apples', 'Red delicious apples', '1234567890124', (SELECT id FROM public.categories WHERE name = 'Fruits & Vegetables'), 4.00, 2.50, 30, 5, 100, 'kg'),
  ('Whole Milk', 'Fresh whole milk 1L', '1234567890125', (SELECT id FROM public.categories WHERE name = 'Dairy & Eggs'), 3.50, 2.00, 25, 5, 50, 'pcs'),
  ('White Bread', 'Whole wheat bread loaf', '1234567890126', (SELECT id FROM public.categories WHERE name = 'Bakery'), 2.00, 1.20, 40, 10, 80, 'pcs'),
  ('Coca Cola', 'Coca Cola 500ml bottle', '1234567890127', (SELECT id FROM public.categories WHERE name = 'Beverages'), 1.50, 0.80, 60, 20, 150, 'pcs');