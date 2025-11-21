-- Quick verification query to check if community tables exist
-- Run this in Supabase SQL Editor to verify the tables were created

SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('posts', 'post_likes', 'post_comments')
ORDER BY table_name;

-- If the above returns 3 rows, the tables exist!
-- If it returns 0 rows, you need to run 005_create_community_posts.sql

