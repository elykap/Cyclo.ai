# POS Data Import Feature

This feature allows users to upload CSV files containing Point of Sale (POS) transaction data, which is automatically parsed and stored in a Supabase database table.

## Implementation Overview

### 1. Database Schema

A new table `pos_transactions` has been created in Supabase with the following structure:

- `id` (BIGSERIAL) - Primary key
- `user_id` (UUID) - References the authenticated user
- `product_id` (TEXT) - Product identifier
- `product_name` (TEXT) - Product name
- `price` (DECIMAL) - Price per unit
- `amount` (DECIMAL) - Quantity/amount
- `customer_id` (TEXT) - Customer identifier
- `date` (TIMESTAMP) - Transaction date
- `source_file` (TEXT) - Original CSV filename
- `created_at` (TIMESTAMP) - Import timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

### 2. CSV Parser

A flexible CSV parser (`src/utils/csvParser.js`) that:
- Automatically detects column headers (case-insensitive)
- Handles various column name formats (spaces, underscores, etc.)
- Parses dates in multiple formats
- Strips currency symbols from price/amount fields
- Handles quoted values and special characters

### 3. Integration

The CSV parsing is integrated into the ProfilePage component:
- When users upload CSV files, they are automatically parsed
- Data is inserted into the `pos_transactions` table in batches of 100 rows
- Progress messages are shown during parsing and import
- Files are still uploaded to Supabase storage for reference

## Setup Instructions

### 1. Run the Database Migration

Execute the SQL migration file in your Supabase dashboard:

```bash
# Go to Supabase Dashboard > SQL Editor
# Run the contents of: supabase/migrations/001_create_pos_transactions.sql
```

Or if you're using Supabase CLI:

```bash
supabase db push
```

### 2. Verify Row Level Security

The migration includes RLS policies that ensure users can only access their own data. Verify these policies are active in your Supabase dashboard under Authentication > Policies.

## Usage

1. Users upload CSV files through the Profile page
2. The system automatically:
   - Parses the CSV file
   - Validates and transforms the data
   - Inserts transactions into the database
   - Uploads the original file to storage
3. Users see progress messages during the import process

## CSV Format

See `CSV_FORMAT.md` for detailed information about the expected CSV format and supported column names.

## Querying the Data

Once imported, you can query the data using Supabase:

```javascript
// Get all transactions for the current user
const { data, error } = await supabase
  .from('pos_transactions')
  .select('*')
  .order('date', { ascending: false })

// Get transactions for a specific date range
const { data, error } = await supabase
  .from('pos_transactions')
  .select('*')
  .gte('date', '2024-01-01')
  .lte('date', '2024-12-31')

// Get transactions by customer
const { data, error } = await supabase
  .from('pos_transactions')
  .select('*')
  .eq('customer_id', 'CUST-123')
```

## Error Handling

- Invalid CSV files will show an error message
- Missing columns are handled gracefully (set to null)
- Database insertion errors are caught and reported
- Files are still uploaded to storage even if parsing fails (for debugging)

## Future Enhancements

Potential improvements:
- Duplicate detection and handling
- Data validation rules
- Import history/audit log
- Bulk update/delete functionality
- Export functionality
- Data visualization and analytics

