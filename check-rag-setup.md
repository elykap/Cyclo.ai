# RAG Setup Verification Checklist

If you see "Successfully processed 1 document" but don't see it in Supabase, follow these steps:

## 1. Verify Database Tables Exist

Go to your Supabase Dashboard → SQL Editor and run:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('documents', 'document_chunks');

-- Check if pgvector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';
```

**Expected result:** You should see both tables listed, and the vector extension should exist.

## 2. Run the Migration

If the tables don't exist, run the migration:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/002_create_documents_vector_store.sql`
3. Paste and run it

## 3. Check Browser Console

After uploading a document, open your browser's Developer Console (F12) and look for:
- Any error messages
- Log messages starting with "Document created successfully:" or "Error processing document"
- Check the Network tab for failed API calls

## 4. Verify RLS Policies

Make sure Row Level Security is set up correctly:

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('documents', 'document_chunks');
```

## 5. Test Direct Query

Try querying the documents table directly:

```sql
-- Replace YOUR_USER_ID with your actual user ID from auth.users
SELECT * FROM documents WHERE user_id = 'YOUR_USER_ID';
```

## Common Issues

### Issue: "relation 'documents' does not exist"
**Solution:** Run the migration file `002_create_documents_vector_store.sql`

### Issue: "column 'embedding' is of type vector but expression is of type text"
**Solution:** The embedding format might be wrong. Check that embeddings are arrays of numbers.

### Issue: "permission denied for table documents"
**Solution:** Check RLS policies are set up correctly in the migration.

### Issue: "extension 'vector' does not exist"
**Solution:** Enable pgvector extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

