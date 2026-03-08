# BitFlow Lend - Vercel Production Deployment Guide

> **Last updated:** March 8, 2026  
> **Target:** Vercel (Vite + React SPA)  
> **Build status:** Verified passing

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Files Created/Modified for Deployment](#2-files-createdmodified-for-deployment)
3. [Step-by-Step: Vercel Deployment](#3-step-by-step-vercel-deployment)
4. [Environment Variables Setup](#4-environment-variables-setup)
5. [Post-Deployment Verification](#5-post-deployment-verification)
6. [Custom Domain Setup](#6-custom-domain-setup)
7. [OG Images for Social Sharing](#7-og-images-for-social-sharing)
8. [Security Hardening](#8-security-hardening)
9. [Monitoring & Alerts](#9-monitoring--alerts)
10. [Rollback Plan](#10-rollback-plan)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Pre-Deployment Checklist

Before deploying, confirm every item is complete:

### Code Readiness

- [x] Production build passes (`npm run build` — verified)
- [x] TypeScript compilation passes (zero errors)
- [x] `vercel.json` created with SPA rewrites, security headers, and caching
- [x] Vite config optimized (sourcemaps disabled, chunk splitting enabled)
- [x] `.env.production` template created
- [x] Favicon and placeholder OG image added to `public/`
- [ ] **YOU:** Replace placeholder OG/Twitter images with real branded PNGs (see Section 7)
- [ ] **YOU:** Verify `ACTIVE_NETWORK` in `src/config/contracts.ts` is set to `'mainnet'`
- [ ] **YOU:** Run `npm run build` locally one final time to confirm

### Repository Readiness

- [ ] **YOU:** All changes committed to Git
- [ ] **YOU:** Repository pushed to GitHub (or GitLab/Bitbucket)
- [ ] **YOU:** No secrets in committed files (the `.gitignore` blocks `.env` files)
- [ ] **YOU:** `package-lock.json` is committed (needed for reproducible builds — see note below)

> **Important:** Your `.gitignore` currently ignores `package-lock.json`. For Vercel deployments, you should **commit your lockfile** to ensure reproducible builds. Remove `package-lock.json` from `.gitignore` before deploying.

---

## 2. Files Created/Modified for Deployment

| File | Action | Purpose |
|------|--------|---------|
| `frontend/vercel.json` | **Created** | Vercel build config, SPA rewrites, security headers, asset caching |
| `frontend/.env.production` | **Created** | Production environment variables template |
| `frontend/vite.config.ts` | **Modified** | Disabled sourcemaps, added chunk splitting for React and Stacks |
| `frontend/index.html` | **Modified** | Updated favicon path from `/vite.svg` to `/favicon.svg` |
| `frontend/public/og-image.svg` | **Created** | Placeholder Open Graph image (replace with PNG) |
| `frontend/public/vite.svg` | **Created** | Fallback favicon SVG |

---

## 3. Step-by-Step: Vercel Deployment

### Step 3.1 — Create a Vercel Account

1. Go to [https://vercel.com/signup](https://vercel.com/signup)
2. Sign up with your **GitHub** account (recommended for automatic deployments)
3. Complete email verification if prompted

### Step 3.2 — Prepare Your Git Repository

Your Vercel deployment root must be the **frontend** directory. Open a terminal:

```bash
# 1. Navigate to the frontend directory
cd bitflow-core/frontend

# 2. Ensure the build works locally
npm install
npm run build

# 3. Verify dist/ folder was created successfully
ls dist/
```

If the build fails, fix all errors before proceeding.

### Step 3.3 — Push Code to GitHub

```bash
# From the repo root (BitFlow-Lend/)
cd ../..

# Stage all changes
git add -A

# Commit
git commit -m "chore: prepare frontend for Vercel production deployment"

# Push to your remote
git push origin main
```

### Step 3.4 — Import Project in Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your **BitFlow-Lend** repository
4. Vercel will detect the monorepo structure. Configure these settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `bitflow-core/frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Node.js Version** | 20.x (recommended) |

> **Critical:** Set **Root Directory** to `bitflow-core/frontend`. This tells Vercel where your frontend app lives within the monorepo. Click the "Edit" button next to Root Directory and type `bitflow-core/frontend`.

### Step 3.5 — Add Environment Variables

Before clicking "Deploy", add these environment variables in the Vercel project settings:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_NETWORK` | `mainnet` | Production |
| `VITE_CONTRACT_ADDRESS` | `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193` | Production |
| `VITE_STACKS_API_URL` | `https://api.mainnet.hiro.so` | Production |
| `VITE_APP_NAME` | `BitFlow Lend` | Production |
| `VITE_APP_VERSION` | `1.0.0` | Production |
| `VITE_ENABLE_LIQUIDATIONS` | `true` | Production |
| `VITE_ENABLE_NOTIFICATIONS` | `true` | Production |

For a **Preview/Staging** environment (optional):

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_NETWORK` | `testnet` | Preview |
| `VITE_CONTRACT_ADDRESS` | `ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0` | Preview |
| `VITE_STACKS_API_URL` | `https://api.testnet.hiro.so` | Preview |

### Step 3.6 — Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (typically 30-60 seconds)
3. Vercel will provide a URL like `https://bitflow-lend-xxxx.vercel.app`
4. Click the URL to verify the deployment

### Step 3.7 — Verify the Deployment

Open the deployed URL and check:

- [ ] Page loads without errors (check browser DevTools Console)
- [ ] Loading spinner appears then transitions to the dashboard
- [ ] Network indicator shows "Mainnet" (top of page)
- [ ] Wallet connect button is visible and clickable
- [ ] Protocol stats display correctly
- [ ] No CORS errors in the console
- [ ] Favicon displays correctly in the browser tab

---

## 4. Environment Variables Setup

### How Vite Environment Variables Work

- Only variables prefixed with `VITE_` are exposed to the frontend bundle
- They are **baked into the build** at build time (not runtime)
- Changing env vars in Vercel requires **redeployment** to take effect

### Adding/Updating Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add or update variables
4. Click **Save**
5. Go to **Deployments** tab → click **"..."** on the latest deployment → **"Redeploy"**

### Environment-Specific Configuration

Vercel supports three environments:
- **Production** — your live site (main/master branch)
- **Preview** — pull request/branch previews
- **Development** — local development

Set different values per environment. For example, use `testnet` for Preview deployments so PR reviewers test against testnet.

---

## 5. Post-Deployment Verification

### Automated Checks

Run these checks against your deployed URL (replace `YOUR_URL`):

```bash
# 1. Check the site is reachable
curl -I https://YOUR_URL.vercel.app

# 2. Check security headers are applied
curl -sI https://YOUR_URL.vercel.app | grep -E "(X-Content-Type|X-Frame|X-XSS|Referrer-Policy|Permissions-Policy)"

# 3. Check SPA routing works (should return 200, not 404)
curl -sI https://YOUR_URL.vercel.app/some-random-path

# 4. Check static assets have long cache
curl -sI https://YOUR_URL.vercel.app/assets/vendor-react-CEaZ36i6.js | grep Cache-Control
```

### Expected Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Manual QA Checklist

| Test | How to Verify |
|------|---------------|
| Page loads | Visit the URL, confirm dashboard renders |
| Wallet connection | Click "Connect Wallet", confirm Hiro Wallet popup |
| Network indicator | Should show "Mainnet" badge |
| Deposit flow | Connect wallet, enter amount, click Deposit |
| Borrow flow | Connect wallet, enter amount/term, click Borrow |
| Repay flow | If loan exists, attempt repay |
| Health monitor | Verify health factor displays for active loans |
| Transaction history | Confirm tx links open Hiro Explorer |
| Mobile responsiveness | Test on mobile device or Chrome DevTools mobile view |
| Error states | Disconnect wallet, verify graceful error handling |

---

## 6. Custom Domain Setup

### Step 6.1 — Add Domain in Vercel

1. Go to your Vercel project → **Settings** → **Domains**
2. Enter your domain: `app.bitflow.finance` (or your chosen domain)
3. Click **Add**

### Step 6.2 — Configure DNS

Vercel will show you DNS records to add. Go to your domain registrar (Namecheap, Cloudflare, GoDaddy, etc.) and add:

**Option A: Using CNAME (subdomains like `app.bitflow.finance`):**

| Type | Name | Value |
|------|------|-------|
| CNAME | app | cname.vercel-dns.com |

**Option B: Using A record (apex domain like `bitflow.finance`):**

| Type | Name | Value |
|------|------|-------|
| A | @ | 76.76.21.21 |

### Step 6.3 — SSL Certificate

Vercel automatically provisions and renews SSL certificates via Let's Encrypt. No manual configuration needed. SSL is active within minutes of DNS propagation.

### Step 6.4 — Update OG Meta Tags

After setting up your custom domain, update the URLs in `index.html`:

```html
<meta property="og:url" content="https://app.bitflow.finance/" />
<meta property="twitter:url" content="https://app.bitflow.finance/" />
```

Commit and push to trigger a redeployment.

---

## 7. OG Images for Social Sharing

Your `index.html` references `/og-image.png` and `/twitter-image.png`. Currently, only an SVG placeholder exists.

### Create Real OG Images

**Required sizes:**
- `og-image.png` — 1200 x 630 pixels (Facebook/LinkedIn)
- `twitter-image.png` — 1200 x 600 pixels (Twitter/X)

**Steps:**

1. Design the images using Figma, Canva, or any design tool
2. Include: BitFlow Lend logo, tagline "Decentralized Lending on Stacks", brand colors (#1e3a8a → #3b82f6 gradient)
3. Export as **PNG** (not SVG — social media crawlers require raster images)
4. Place them in `frontend/public/`:

```
frontend/public/
  ├── favicon.svg
  ├── og-image.png      ← 1200x630
  └── twitter-image.png ← 1200x600
```

5. Commit, push, and Vercel will auto-deploy

### Verify OG Tags

After deployment, test your OG tags:
- **Facebook:** https://developers.facebook.com/tools/debug/
- **Twitter:** https://cards-dev.twitter.com/validator
- **LinkedIn:** https://www.linkedin.com/post-inspector/

---

## 8. Security Hardening

### Already Configured

- Security headers via `vercel.json` (X-Frame-Options, CSP hints, etc.)
- Sourcemaps disabled in production build
- No secrets in client-side code (all are public API URLs)
- STX post-conditions protect against unauthorized transfers
- TypeScript strict mode prevents common bugs

### Additional Steps (Recommended)

1. **Enable Vercel Deployment Protection:**
   - Go to Settings → Deployment Protection
   - Enable "Vercel Authentication" for Preview deployments
   - This prevents unauthorized access to preview builds

2. **Set up Vercel Speed Insights (optional):**
   - Dashboard → Analytics → Enable Speed Insights
   - Monitors Core Web Vitals

3. **Content Security Policy (advanced):**
   If you want to add a full CSP header, add to `vercel.json` headers:
   ```json
   {
     "key": "Content-Security-Policy",
     "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.mainnet.hiro.so https://api.testnet.hiro.so; img-src 'self' data:; frame-ancestors 'none'"
   }
   ```

---

## 9. Monitoring & Alerts

### Vercel Built-in Monitoring

1. **Deployment Logs:** Vercel Dashboard → Deployments → click any deployment → Logs
2. **Function Logs:** (N/A — this is a static SPA, no serverless functions)
3. **Analytics:** Enable Vercel Analytics for traffic insights

### Recommended Third-Party Monitoring

| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **UptimeRobot** | Uptime monitoring (ping every 5 min) | Yes (50 monitors) |
| **Sentry** | Error tracking (captures JS errors) | Yes (5K events/month) |
| **Google Search Console** | SEO monitoring | Free |

### Setting Up UptimeRobot

1. Sign up at [https://uptimerobot.com](https://uptimerobot.com)
2. Add a new monitor:
   - Type: HTTP(S)
   - URL: `https://YOUR_DOMAIN`
   - Interval: 5 minutes
3. Set up email/Slack alerts for downtime

---

## 10. Rollback Plan

### Instant Rollback via Vercel

If something goes wrong after deployment:

1. Go to **Deployments** tab in your Vercel project
2. Find the **previous working deployment**
3. Click the **"..."** menu → **"Promote to Production"**
4. The previous version is live immediately (< 1 second)

### Rollback via Git

```bash
# Revert the last commit
git revert HEAD
git push origin main
# Vercel auto-deploys the reverted code
```

---

## 11. Troubleshooting

### Build Fails on Vercel

| Error | Solution |
|-------|----------|
| `tsc: command not found` | Ensure `typescript` is in `devDependencies` (it is) |
| `Cannot find module '@stacks/connect'` | Ensure `npm install` runs first (check Install Command) |
| `ENOMEM` (out of memory) | Add `NODE_OPTIONS=--max-old-space-size=4096` to env vars |
| Module resolution errors | Ensure Root Directory is set to `bitflow-core/frontend` |

### CORS Errors in Console

The Hiro API (`api.mainnet.hiro.so`) supports CORS by default. If you see CORS errors:
- Check if you're calling the correct API URL
- Ensure `VITE_STACKS_API_URL` is correct
- Check if Hiro API is experiencing downtime: https://status.hiro.so

### Blank Page After Deploy

1. Open browser DevTools → Console tab
2. Look for errors
3. Most common cause: environment variables not set (check Vercel env vars)
4. Check: is `index.html` being served? (view page source)

### Wallet Connection Fails

- Ensure Hiro Wallet browser extension is installed
- The wallet detects network from the dApp — ensure `ACTIVE_NETWORK` matches
- Check if `@stacks/connect` version is compatible with the wallet version

---

## Quick Reference Commands

```bash
# Local development
cd bitflow-core/frontend
npm run dev          # Start dev server on port 3000

# Production build test
npm run build        # TypeScript + Vite build → dist/
npm run preview      # Preview production build locally

# Code quality
npm run lint         # ESLint check
npm run test         # Run tests

# Deploy (automatic via Git push)
git add -A && git commit -m "deploy: update" && git push origin main
```

---

## Build Output Summary (Verified)

```
dist/index.html                              4.53 kB  (gzip: 1.55 kB)
dist/assets/index-*.css                     38.22 kB  (gzip: 6.48 kB)
dist/assets/connect-modal.entry-*.js        16.63 kB  (gzip: 5.31 kB)
dist/assets/index-*.js                      76.02 kB  (gzip: 17.89 kB)
dist/assets/vendor-react-*.js              140.82 kB  (gzip: 45.25 kB)
dist/assets/vendor-stacks-*.js             201.79 kB  (gzip: 68.04 kB)
─────────────────────────────────────────────────────────────────────
Total gzipped:                             ~145 kB
```

This is a healthy bundle size for a DeFi application with blockchain libraries.
