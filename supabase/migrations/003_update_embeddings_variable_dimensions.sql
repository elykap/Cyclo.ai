-- Migration to support 384-dimension embeddings
-- This allows using embedding models like slate-30m and all-minilm-l6-v2 (384 dimensions)
-- Note: If you have existing 768-dimension embeddings, they will need to be regenerated

-- Drop the existing index (we'll recreate it after altering the column)
DROP INDEX IF EXISTS idx_document_chunks_embedding;

-- Clear existing embeddings that have wrong dimensions (optional - comment out if you want to keep existing data)
-- WARNING: This will delete all existing embeddings. Uncomment only if you want to start fresh.
-- DELETE FROM document_chunks WHERE embedding IS NOT NULL;

-- Alter the embedding column to support 384 dimensions
-- This matches slate-30m-english-rtrvr and all-minilm-l6-v2 models
ALTER TABLE document_chunks 
  ALTER COLUMN embedding TYPE vector(384);

-- Recreate the HNSW index for 384 dimensions
CREATE INDEX idx_document_chunks_embedding ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Update the search function to use 384 dimensions
-- Drop the old function
DROP FUNCTION IF EXISTS search_document_chunks(vector(768), UUID, FLOAT, INT);
DROP FUNCTION IF EXISTS search_document_chunks(vector, UUID, FLOAT, INT);

-- Create new function that accepts 384-dimension vectors
CREATE OR REPLACE FUNCTION search_document_chunks(
  query_embedding vector(384),
  user_uuid UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  document_id BIGINT,
  content TEXT,
  chunk_index INTEGER,
  similarity FLOAT,
  document_title TEXT,
  file_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.title AS document_title,
    d.file_name
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE dc.user_id = user_uuid
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

