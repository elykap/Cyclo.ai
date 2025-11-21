-- Create pos_transactions table for storing parsed POS CSV data
CREATE TABLE IF NOT EXISTS pos_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT,
  price DECIMAL(10, 2),
  amount DECIMAL(10, 2),
  customer_id TEXT,
  date TIMESTAMP WITH TIME ZONE,
  source_file TEXT, -- Original filename
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_pos_transactions_user_id ON pos_transactions(user_id);

-- Create index on date for date range queries
CREATE INDEX IF NOT EXISTS idx_pos_transactions_date ON pos_transactions(date);

-- Create index on customer_id for customer queries
CREATE INDEX IF NOT EXISTS idx_pos_transactions_customer_id ON pos_transactions(customer_id);

-- Enable Row Level Security
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own transactions
CREATE POLICY "Users can view their own transactions"
  ON pos_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own transactions
CREATE POLICY "Users can insert their own transactions"
  ON pos_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own transactions
CREATE POLICY "Users can update their own transactions"
  ON pos_transactions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own transactions
CREATE POLICY "Users can delete their own transactions"
  ON pos_transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_pos_transactions_updated_at
  BEFORE UPDATE ON pos_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

