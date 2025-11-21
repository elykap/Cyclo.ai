# CSV Format for POS Data Import

This document describes the expected CSV format for importing Point of Sale (POS) transaction data.

## Required Columns

Your CSV file should include at least one of the following columns (case-insensitive, spaces and underscores are flexible):

### Product Information
- `product_id`, `product id`, `productid`, `id`, `sku` - Unique identifier for the product
- `product_name`, `product name`, `productname`, `name`, `item`, `item_name` - Name of the product

### Transaction Details
- `price`, `unit_price`, `unit price`, `cost`, `amount` - Price per unit (numeric, currency symbols will be stripped)
- `amount`, `quantity`, `qty`, `count`, `units` - Quantity/amount sold (numeric)
- `customer_id`, `customer id`, `customerid`, `customer`, `client_id`, `client id` - Customer identifier
- `date`, `transaction_date`, `transaction date`, `timestamp`, `time`, `created_at`, `created at` - Transaction date

## Date Formats Supported

The parser supports the following date formats:
- `YYYY-MM-DD` (e.g., 2024-01-15)
- `MM/DD/YYYY` (e.g., 01/15/2024)
- `MM-DD-YYYY` (e.g., 01-15-2024)
- `YYYY/MM/DD` (e.g., 2024/01/15)
- ISO 8601 format (e.g., 2024-01-15T10:30:00Z)

## Example CSV

```csv
product_id,product_name,price,amount,customer_id,date
SKU-001,Widget A,19.99,2,CUST-123,2024-01-15
SKU-002,Widget B,29.99,1,CUST-456,2024-01-16
SKU-003,Widget C,15.50,3,CUST-123,2024-01-17
```

## Notes

- The first row should contain headers
- Empty rows will be skipped
- Columns can be in any order
- Missing columns will be set to `null`
- Price and amount values can include currency symbols (e.g., "$19.99" or "€15.50") - they will be automatically stripped
- CSV files with quoted values are supported (e.g., `"Product Name, Special Edition"`)

## Data Storage

Once imported, the data is stored in the `pos_transactions` table in Supabase with the following schema:

- `id` - Auto-generated unique identifier
- `user_id` - Your user ID (automatically set)
- `product_id` - Product identifier from CSV
- `product_name` - Product name from CSV
- `price` - Price per unit (decimal)
- `amount` - Quantity/amount (decimal)
- `customer_id` - Customer identifier from CSV
- `date` - Transaction date (timestamp)
- `source_file` - Original filename
- `created_at` - Import timestamp
- `updated_at` - Last update timestamp

