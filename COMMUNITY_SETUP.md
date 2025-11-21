# Community Feature Setup

The Community feature requires database tables to be created in Supabase. The migration file is located at:

`supabase/migrations/005_create_community_posts.sql`

## Running the Migration

To create the required tables, you need to run the migration in your Supabase project:

1. **Via Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase/migrations/005_create_community_posts.sql`
   - Run the SQL script

2. **Via Supabase CLI (if configured):**
   ```bash
   supabase db push
   ```

## Tables Created

The migration creates the following tables:

- **posts**: Main table for community posts
- **post_likes**: Tracks user likes on posts
- **post_comments**: Stores comments on posts

## Features

- Create, read, update, and delete posts
- Like/unlike posts
- Comment on posts
- Search and filter posts
- Sort by recent or top posts

## Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:
- Anyone can view posts, likes, and comments
- Users can only create/update/delete their own content

