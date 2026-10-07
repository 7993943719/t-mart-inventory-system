export interface Product {
  id: string;
  business_id?: string;
  tenant_id?: string;
  name: string;
  barcode: string;
  category: string;
  brand?: string | null;
  subcategory?: string | null;
  pack_size?: string | null;
  description?: string | null;
  unit: string;
  purchase_price: number;
  selling_price: number;
  mrp: number;
  stock_quantity: number;
  minimum_stock: number;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type UserRole = 'ADMIN' | 'STOCK_KEEPER' | 'BILLING_STAFF' | 'DELIVERY_STAFF';

export interface UserProfile {
  id: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  company_name?: string;
  created_at?: string;
}

export type StockCountStatus = 'MATCHED' | 'SHORTAGE' | 'EXCESS';
export type AdminReviewStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'INVESTIGATED' | 'CORRECTED' | 'PENDING_REVIEW';

export interface StockCount {
  id: string;
  product_id: string;
  product_name: string;
  barcode: string;
  stock_keeper_id?: string;
  stock_keeper_name: string;
  expected_stock: number;
  actual_stock: number;
  difference: number;
  unit: string;
  status: StockCountStatus;
  photo_url: string;
  notes?: string;
  admin_status: AdminReviewStatus;
  admin_notes?: string;
  created_at: string;
}

export interface StockDiscrepancy {
  id: string;
  stock_count_id: string;
  product_id: string;
  product_name: string;
  discrepancy_type: 'SHORTAGE' | 'EXCESS';
  expected_qty: number;
  actual_qty: number;
  difference_qty: number;
  unit: string;
  stock_keeper_name: string;
  photo_url: string;
  status: AdminReviewStatus;
  admin_notes?: string;
  created_at: string;
}
