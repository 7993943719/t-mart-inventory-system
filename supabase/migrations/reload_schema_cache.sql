-- Supabase PostgREST Schema Cache Reload Script
-- Run this in your Supabase SQL Editor if PostgREST returns PGRST204 after adding new columns

NOTIFY pgrst, 'reload schema';
