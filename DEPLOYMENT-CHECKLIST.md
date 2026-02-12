# Vercel Deployment Checklist

Use this checklist to track your deployment progress.

## ✅ Pre-Deployment Setup

- [ ] Install dependencies: `npm install`
- [ ] Verify local build works: `npm run build`
- [ ] Set up local environment variables in `.env.local`
- [ ] Test app locally: `npm run dev`

## ✅ Database Setup (Neon)

- [ ] Create Neon account at [neon.tech](https://neon.tech)
- [ ] Create new project named "lanqua"
- [ ] Save connection string (postgres://...)
- [ ] Run SQL initialization script (see DEPLOYMENT.md)
- [ ] Verify tables created successfully

## ✅ Git Repository

- [ ] Commit all changes: `git add . && git commit -m "Prepare for deployment"`
- [ ] Create GitHub/GitLab/Bitbucket repository
- [ ] Push code: `git push -u origin master`

## ✅ Vercel Setup

- [ ] Create Vercel account at [vercel.com](https://vercel.com)
- [ ] Import project from Git
- [ ] Configure environment variables:
  - [ ] `DATABASE_URL` (from Neon)
  - [ ] `OPENAI_API_KEY`
  - [ ] `NODE_ENV` = "production"
  - [ ] `DEEPL_API_KEY` (optional)
- [ ] Deploy project

## ✅ Post-Deployment Testing

- [ ] Visit your Vercel URL
- [ ] Test creating a new chat
- [ ] Test voice recording
- [ ] Test AI responses
- [ ] Verify database persistence (create chat, refresh, check it's still there)
- [ ] Test translation feature (if DeepL key added)
- [ ] Check Vercel logs for any errors

## ✅ Optional Enhancements

- [ ] Set up custom domain
- [ ] Enable Vercel Analytics
- [ ] Configure access control (password or middleware)
- [ ] Set up error monitoring (Sentry)
- [ ] Enable preview deployments

## 🔧 Troubleshooting

If something doesn't work:

1. **Check Vercel build logs** - Deployments → [Select deployment] → Build Logs
2. **Check runtime logs** - Functions tab
3. **Verify environment variables** - Settings → Environment Variables
4. **Test database connection** - Check Neon dashboard
5. **Review [DEPLOYMENT.md](./DEPLOYMENT.md)** for detailed troubleshooting

## 📝 Environment Variable Reference

```bash
# Production (Vercel)
DATABASE_URL=postgres://user:pass@host/db
OPENAI_API_KEY=sk-...
NODE_ENV=production
DEEPL_API_KEY=... (optional)

# Local Development
DATABASE_URL=file:./data/lanqua.db
OPENAI_API_KEY=sk-...
NODE_ENV=development
```

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ Build completes without errors
- ✅ App loads at Vercel URL
- ✅ Can create and persist chats
- ✅ Voice features work
- ✅ AI responses are generated
- ✅ Data persists across page refreshes

---

**Need help?** See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.
