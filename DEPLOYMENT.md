# Deploying Lanqua to Vercel

This guide walks you through deploying your Lanqua language tutoring app to Vercel with a free Neon PostgreSQL database.

## Prerequisites

- GitHub, GitLab, or Bitbucket account
- Vercel account (free at [vercel.com](https://vercel.com))
- Neon account (free at [neon.tech](https://neon.tech))

## Step 1: Set Up PostgreSQL Database (Neon)

1. **Create Neon Account**
   - Go to [neon.tech](https://neon.tech)
   - Sign up for free (512MB storage, always-on)

2. **Create a Database**
   - Click "Create Project"
   - Name it "ai tutor"
   - Select your preferred region
   - **Save your connection string** - it looks like:
     ```
        psql 'postgresql://neondb_owner: 
     ```

3. **Initialize Database Schema**
   - In Neon dashboard, go to SQL Editor
   - Run this initialization script:

   ```sql
   CREATE TABLE IF NOT EXISTS chats (
     id TEXT PRIMARY KEY,
     title TEXT,
     topic_type TEXT DEFAULT 'general',
     topic_details TEXT,
     language TEXT DEFAULT 'en',
     dialect TEXT DEFAULT 'american',
     thread_id TEXT,
     ai_provider TEXT DEFAULT 'openai',
     ai_mode TEXT DEFAULT 'chat',
     created_at TIMESTAMP DEFAULT NOW() NOT NULL,
     updated_at TIMESTAMP DEFAULT NOW() NOT NULL
   );

   CREATE TABLE IF NOT EXISTS messages (
     id TEXT PRIMARY KEY,
     chat_id TEXT REFERENCES chats(id) ON DELETE CASCADE,
     role TEXT NOT NULL,
     content TEXT NOT NULL,
     audio_url TEXT,
     audio_blob TEXT,
     audio_format TEXT,
     analysis TEXT,
     created_at TIMESTAMP DEFAULT NOW() NOT NULL
   );

   CREATE TABLE IF NOT EXISTS settings (
     key TEXT PRIMARY KEY,
     value TEXT
   );

   CREATE TABLE IF NOT EXISTS vocabulary (
     id TEXT PRIMARY KEY,
     word TEXT NOT NULL,
     translation TEXT,
     example TEXT,
     context TEXT,
     created_at TIMESTAMP DEFAULT NOW() NOT NULL
   );

   CREATE TABLE IF NOT EXISTS chat_summaries (
     chat_id TEXT PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
     content TEXT,
     last_message_index TEXT,
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```

## Quick Fix for Common Errors

### ❌ Error: "Database not initialized. Make sure DATABASE_URL is set"
**You need to add DATABASE_URL to Vercel:**

1. **Get your Neon connection string:**
   - Go to [neon.tech](https://neon.tech) → Sign up (free)
   - Create a new project
   - Copy the connection string (looks like: `postgresql://username:password@host.neon.tech/dbname`)

2. **Add to Vercel:**
   - Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `DATABASE_URL` = `postgresql://...` (your Neon string)
   - Click "Save"
   - Go to Deployments → Click "..." → Redeploy

3. **Initialize database schema:**
   - In Neon dashboard → SQL Editor
   - Run the SQL script from Step 1 below

### ❌ Error: "OpenAI API key not configured"
**Add OPENAI_API_KEY to Vercel:**
- Settings → Environment Variables
- Add: `OPENAI_API_KEY` = `sk-...` (your OpenAI key from [platform.openai.com](https://platform.openai.com))
- Redeploy

---

## Step 2: Push Your Code to Git

If you haven't already:

```powershell
# Add all files
git add .

# Commit changes
git commit -m "Prepare for Vercel deployment"

# Create GitHub repository and push (or use GitLab/Bitbucket)
gh repo create ai_tutor --private --source=. --remote=origin --push
# Or manually: git remote add origin YOUR_REPO_URL
# git push -u origin master
```

## Step 3: Deploy to Vercel

1. **Import Project**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your Git repository (lanqua)
   - Vercel auto-detects Next.js configuration

2. **Configure Environment Variables** ⚠️ **CRITICAL STEP**
   
   In Vercel: **Settings → Environment Variables → Add**

   **Required (app won't work without these):**
   - **`DATABASE_URL`**: Your Neon PostgreSQL connection string (from Step 1 above)
     - Example: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb`
   - **`OPENAI_API_KEY`**: Your OpenAI API key
     - Get it from: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
     - Example: `sk-proj-xxxxxxxxxxxxx`
   - **`NODE_ENV`**: `production`

   **Optional:**
   - `DEEPL_API_KEY`: If using DeepL translation
   - `OLLAMA_BASE_URL`: If using Ollama (not typical in cloud)

   ⚠️ **Make sure to click "Apply to all environments" when adding variables!**

3. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - Your app will be live at `https://your-project.vercel.app`

## Step 4: Test Your Deployment

1. Visit your Vercel URL
2. Create a new chat
3. Test voice features
4. Verify database is working

## Step 5: Set Up Custom Domain (Optional)

1. In Vercel dashboard → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## Step 6: Enable Automatic Deployments

Vercel automatically deploys when you push to your main branch:

```powershell
# Make changes to your code
git add .
git commit -m "Update feature"
git push

# Vercel automatically deploys in ~2 minutes
```

## Access Control (Optional)

To make your app private:

### Option 1: Password Protection (Vercel Pro)
- Settings → Deployment Protection → Password Protection

### Option 2: Simple Auth Middleware
Add to `src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (authHeader !== `Bearer ${process.env.ACCESS_TOKEN}`) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

Add `ACCESS_TOKEN` to Vercel environment variables.

## Troubleshooting

### Build Error: "Cannot open database because the directory does not exist"
**Error during build:**
```
TypeError: Cannot open database because the directory does not exist
Error: Failed to collect page data for /api/chat
```

**Solution:**
1. **Set DATABASE_URL** in Vercel environment variables (Settings → Environment Variables)
2. Use your Neon PostgreSQL connection string (starts with `postgresql://`)
3. Redeploy the project

**Why this happens:**
- The app uses SQLite for local development but requires PostgreSQL for production
- If DATABASE_URL is missing or incorrectly formatted, the build tries to use SQLite
- Vercel's build environment doesn't support creating local SQLite files

### Build Errors
- Check Vercel build logs
- Ensure all environment variables are set
- Verify database connection string is correct

### Database Connection Errors
- Verify Neon database is running
- Check connection string format
- Ensure IP allowlist includes Vercel (usually automatic)

### API Key Issues
- Verify all required API keys are set
- Check for typos in environment variable names
- Ensure no extra spaces in values

## Monitoring & Logs

- **Build Logs**: Vercel Dashboard → Deployments → [Select Deployment]
- **Runtime Logs**: Vercel Dashboard → Functions
- **Database Logs**: Neon Dashboard → Monitoring

## Costs

- **Vercel Free Tier**: 100GB bandwidth, unlimited deployments
- **Neon Free Tier**: 512MB storage, unlimited queries
- **Total**: $0/month for personal use

Both services upgrade seamlessly if you need more resources later.

## Next Steps

- Set up analytics (Vercel Analytics)
- Configure error monitoring (Sentry)
- Add custom domain
- Enable preview deployments for testing

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Neon Docs: https://neon.tech/docs
- Next.js Docs: https://nextjs.org/docs
