-- Create inventory table to store product inventory data
CREATE TABLE IF NOT EXISTS inventory (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  total_sales NUMERIC(15, 2) DEFAULT 0,
  current_stock INTEGER DEFAULT 0, -- Optional: for tracking stock levels
  source_file TEXT, -- Track which CSV file this came from
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id) -- Prevent duplicate products per user
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_total_sales ON inventory(total_sales DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_current_stock ON inventory(current_stock);

-- Enable Row Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory table
CREATE POLICY "Users can view their own inventory"
  ON inventory
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory"
  ON inventory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory"
  ON inventory
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory"
  ON inventory
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_updated_at();

-- Function to get low stock products (products with stock below threshold)
CREATE OR REPLACE FUNCTION get_low_stock_products(
  user_uuid UUID,
  stock_threshold INTEGER DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  product_id TEXT,
  product_name TEXT,
  current_stock INTEGER,
  total_sales NUMERIC(15, 2)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    inv.id,
    inv.product_id,
    inv.product_name,
    inv.current_stock,
    inv.total_sales
  FROM inventory inv
  WHERE inv.user_id = user_uuid
    AND inv.current_stock <= stock_threshold
  ORDER BY inv.current_stock ASC, inv.total_sales DESC;
END;
$$;

-- Function to get best selling products
CREATE OR REPLACE FUNCTION get_best_selling_products(
  user_uuid UUID,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  product_id TEXT,
  product_name TEXT,
  total_sales NUMERIC(15, 2),
  current_stock INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    inv.id,
    inv.product_id,
    inv.product_name,
    inv.total_sales,
    inv.current_stock
  FROM inventory inv
  WHERE inv.user_id = user_uuid
  ORDER BY inv.total_sales DESC
  LIMIT limit_count;
END;
$$;

