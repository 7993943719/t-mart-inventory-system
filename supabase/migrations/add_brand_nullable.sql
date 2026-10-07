-- Ensure public.products table has brand and AI-prep columns safely without dropping data or requiring them

ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS brand TEXT NULL;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS subcategory TEXT NULL;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS pack_size TEXT NULL;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS description TEXT NULL;
