-- Fix security definer view issue by removing SECURITY DEFINER
DROP VIEW IF EXISTS public.products_public;

-- Create regular view for public products access
CREATE VIEW public.products_public AS 
SELECT 
  id, name, description, unit_price, current_stock, 
  min_stock_threshold, max_stock_threshold, barcode, 
  unit, is_active, category_id, supplier_id, 
  created_at, updated_at
FROM public.products 
WHERE is_active = true;

-- Grant select permissions on the view to anon role (for public access)
GRANT SELECT ON public.products_public TO anon;
GRANT SELECT ON public.products_public TO authenticated;