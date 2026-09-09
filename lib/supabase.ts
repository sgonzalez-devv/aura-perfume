import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fiieosdzkpzqtsfijydb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpaWVvc2R6a3B6cXRzZmlqeWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Njk1MzMsImV4cCI6MjEwNDU0NTUzM30.AMAwpCpVDGGMT08sE3emwWjllLG3xeJOE4gd6uVF5tI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  profiles: {
    id: string
    full_name: string
    role: string
  }
  suppliers: {
    id: string
    name: string
    contact_name: string
    email: string
    phone: string
    country: string
    notes: string
  }
  products: {
    id: string
    name: string
    brand: string
    sku: string
    category: string
    concentration: string
    size_ml: number
    gender: string
    fragrance_family: string
    top_notes: string
    heart_notes: string
    base_notes: string
    supplier_id: string
    purchase_price: number
    selling_price: number
    stock_quantity: number
    min_stock_alert: number
    is_active: boolean
  }
  clients: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    whatsapp: string
    city: string
    birthday: string
    gender: string
    notes: string
    loyalty_points: number
    vip_status: boolean
    total_purchases: number
    purchase_count: number
  }
  sales: {
    id: string
    sale_number: string
    client_id: string
    subtotal: number
    discount_amount: number
    total: number
    payment_method: string
    payment_status: string
    notes: string
    created_at: string
  }
  sale_items: {
    id: string
    sale_id: string
    product_id: string
    product_name: string
    product_brand: string
    quantity: number
    unit_price: number
    purchase_price: number
    subtotal: number
    profit: number
  }
  purchase_orders: {
    id: string
    order_number: string
    supplier_id: string
    supplier_name: string
    status: string
    subtotal: number
    shipping_cost: number
    total: number
    ordered_at: string
    expected_at: string
    received_at: string
    notes: string
  }
  purchase_order_items: {
    id: string
    order_id: string
    product_id: string
    product_name: string
    product_brand: string
    quantity_ordered: number
    quantity_received: number
    unit_cost: number
    subtotal: number
  }
  expenses: {
    id: string
    category: string
    description: string
    amount: number
    payment_method: string
    expense_date: string
    created_at: string
  }
}
