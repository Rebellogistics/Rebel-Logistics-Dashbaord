# Supabase Setup Instructions

This guide will help you set up Supabase for the Rebel Logistics application.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)

## Step 1: Create a New Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in the project details:
   - Name: `rebel-logistics` (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Select the region closest to you
4. Click "Create new project" and wait for it to be provisioned (this may take a few minutes)

## Step 2: Get Your API Credentials

1. Once your project is created, go to **Project Settings** (gear icon in the sidebar)
2. Click on **API** in the settings menu
3. You'll find two important values:
   - **Project URL** (looks like `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## Step 3: Configure Environment Variables

1. Create a `.env` file in the root of your project (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL="https://xxxxxxxxxxxxx.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key-here"
   ```

## Step 4: Run Database Migrations

You have two options to set up your database:

### Option A: Using Supabase SQL Editor (Recommended for Quick Setup)

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the sidebar (database icon with a play button)
3. Click **New query**
4. Copy the contents of `supabase/migrations/20240101000000_initial_schema.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the schema creation
7. Create another new query
8. Copy the contents of `supabase/migrations/20240101000001_seed_data.sql`
9. Paste it into the SQL editor
10. Click **Run** to insert the dummy data

### Option B: Using Supabase CLI (For Advanced Users)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Find your project ref in Project Settings > General)

4. Push migrations:
   ```bash
   supabase db push
   ```

## Step 5: Verify the Setup

1. In your Supabase dashboard, go to **Table Editor**
2. You should see three tables:
   - `jobs` - Contains delivery job records
   - `customers` - Contains customer information
   - `messages` - Contains message records

3. Click on each table to verify the dummy data has been inserted

## Step 6: Start Your Application

```bash
npm run dev
```

Your application should now be connected to Supabase and pulling data from the database!

## Updating Components (Already Done)

The following components have been set up to use Supabase:
- Created `src/lib/supabase.ts` - Supabase client configuration
- Created `src/lib/database.types.ts` - TypeScript types for database
- Created `src/hooks/useSupabaseData.ts` - React hooks for data fetching

## Next Steps

To integrate Supabase into your components:

1. Import the hooks from `src/hooks/useSupabaseData.ts`
2. Replace mock data with real data from Supabase

Example:
```typescript
import { useJobs } from '../hooks/useSupabaseData';

function JobsTable() {
  const { data: jobs, isLoading, error } = useJobs();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading jobs</div>;

  return (
    // Your component JSX using the jobs data
  );
}
```

## Security Notes

- The current Row Level Security (RLS) policies allow public access to all tables
- For production, you should implement proper authentication and update the RLS policies
- Never commit your `.env` file to version control (it's already in `.gitignore`)

## Troubleshooting

### "Missing Supabase environment variables" Error
- Make sure you've created a `.env` file with the correct credentials
- Restart your development server after updating environment variables

### Database Connection Issues
- Verify your Project URL and anon key are correct
- Check that your Supabase project is active and not paused

### Data Not Showing
- Verify the migrations ran successfully in the SQL Editor
- Check the Table Editor to ensure data exists in the tables
- Check browser console for any API errors

## Support

For more information, visit:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
