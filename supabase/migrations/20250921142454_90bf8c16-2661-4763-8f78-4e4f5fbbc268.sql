-- Create customers table for customer management
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view customers (for sales process)
CREATE POLICY "Anyone can view customers" 
ON public.customers 
FOR SELECT 
USING (true);

-- Allow staff to manage customers
CREATE POLICY "Staff can manage customers" 
ON public.customers 
FOR ALL 
USING (has_role('admin'::user_role) OR has_role('manager'::user_role) OR has_role('cashier'::user_role));

-- Add customer_id to sales table
ALTER TABLE public.sales ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Add foreign key relationship from products to suppliers
ALTER TABLE public.products 
ADD CONSTRAINT fk_products_supplier 
FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);

-- Fix security issues: Restrict suppliers table access
DROP POLICY IF EXISTS "Anyone can view suppliers" ON public.suppliers;
CREATE POLICY "Staff can view suppliers" 
ON public.suppliers 
FOR SELECT 
USING (has_role('admin'::user_role) OR has_role('manager'::user_role) OR has_role('inventory_staff'::user_role));

-- Fix security issues: Restrict stock_movements access  
DROP POLICY IF EXISTS "Anyone can view stock movements" ON public.stock_movements;
CREATE POLICY "Staff can view stock movements" 
ON public.stock_movements 
FOR SELECT 
USING (has_role('admin'::user_role) OR has_role('manager'::user_role) OR has_role('inventory_staff'::user_role));

-- Fix security issues: Create view for public products without cost_price
CREATE VIEW public.products_public AS 
SELECT 
  id, name, description, unit_price, current_stock, 
  min_stock_threshold, max_stock_threshold, barcode, 
  unit, is_active, category_id, supplier_id, 
  created_at, updated_at
FROM public.products 
WHERE is_active = true;

-- Allow public access to products view (without cost_price)
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Staff can view full products" 
ON public.products 
FOR SELECT 
USING (has_role('admin'::user_role) OR has_role('manager'::user_role) OR has_role('inventory_staff'::user_role) OR has_role('cashier'::user_role));

-- Create trigger for customers updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample customers
INSERT INTO public.customers (name, email, phone, address) VALUES 
('John Doe', 'john@example.com', '+1234567890', '123 Main St'),
('Jane Smith', 'jane@example.com', '+1234567891', '456 Oak Ave'),
('Mike Johnson', 'mike@example.com', '+1234567892', '789 Pine Rd');