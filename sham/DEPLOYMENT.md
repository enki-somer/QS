# Netlify Deployment Guide

This guide will help you deploy your Financial Management System to Netlify with serverless functions.

## Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, etc.)

## Deployment Steps

### 1. Install Dependencies

First, make sure you have all dependencies installed:

```bash
cd sham
npm install
```

### 2. Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your production values:

```env
# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-replace-this
JWT_EXPIRES_IN=7d

# CORS Configuration (replace with your actual Netlify URL)
CORS_ORIGIN=https://YOUR_SITE_NAME.netlify.app
```

### 3. Connect to Netlify

#### Option A: Drag & Drop (Quick Test)

1. Build your project locally:

   ```bash
   npm run build
   ```

2. Go to [netlify.com/drop](https://netlify.com/drop)
3. Drag the `.next` folder to deploy
4. Note: This method doesn't support environment variables or continuous deployment

#### Option B: Git Integration (Recommended)

1. Push your code to GitHub/GitLab
2. Go to Netlify Dashboard
3. Click "New site from Git"
4. Connect your repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Functions directory**: `netlify/functions`

### 4. Configure Environment Variables in Netlify

1. Go to your site dashboard on Netlify
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:

```
JWT_SECRET = your-super-secure-jwt-secret-key
JWT_EXPIRES_IN = 7d
CORS_ORIGIN = https://YOUR_SITE_NAME.netlify.app
```

⚠️ **Important**: Replace `YOUR_SITE_NAME.netlify.app` with your actual Netlify URL.

### 5. Deploy

If using Git integration, Netlify will automatically deploy when you push to your repository.

For manual deployment:

1. Click "Deploy site" in Netlify dashboard
2. Wait for build to complete

## Verification

After deployment, test these endpoints:

### Health Check

```bash
curl https://YOUR_SITE_NAME.netlify.app/health
```

Expected response:

```json
{
  "success": true,
  "message": "نظام الإدارة المالية - الخادم يعمل بشكل طبيعي",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "netlify-functions"
}
```

### Login Test

```bash
curl -X POST https://YOUR_SITE_NAME.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

## Default Login Credentials

For testing purposes, these accounts are pre-configured:

**Admin Account:**

- Username: `admin`
- Password: `admin123`
- Permissions: Full access to all features

**Data Entry Account:**

- Username: `dataentry`
- Password: `dataentry123`
- Permissions: Limited access (no safe, no payments, no user management)

## API Endpoints

All backend endpoints are now serverless functions:

- `GET /health` - Health check
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile and permissions
- `POST /api/auth/verify` - Verify JWT token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/users` - Get all users (admin only)

## Troubleshooting

### Build Errors

1. **Missing dependencies**: Run `npm install` and ensure all packages are in `package.json`
2. **TypeScript errors**: Check `next.config.ts` has `ignoreBuildErrors: true`
3. **Function errors**: Check function logs in Netlify dashboard

### Runtime Errors

1. **CORS errors**: Ensure `CORS_ORIGIN` environment variable matches your domain
2. **JWT errors**: Verify `JWT_SECRET` is set in Netlify environment variables
3. **Function timeouts**: Netlify functions have a 10-second timeout limit

### Environment Variables Not Working

1. Verify variables are set in Netlify dashboard
2. Redeploy after adding/changing environment variables
3. Check variable names match exactly (case-sensitive)

## Security Notes

1. **Change default passwords** in production
2. **Use strong JWT secret** (at least 32 characters)
3. **Enable HTTPS only** (automatic with Netlify)
4. **Monitor function logs** for suspicious activity

## Performance Tips

1. **Enable caching**: Netlify automatically caches static assets
2. **Monitor function usage**: Check Netlify analytics for function performance
3. **Optimize images**: Use Next.js Image component for better performance

## Support

If you encounter issues:

1. Check Netlify function logs in the dashboard
2. Verify environment variables are correctly set
3. Test locally first with `npm run dev`
4. Check browser console for frontend errors

## Development vs Production

**Local Development:**

- Backend runs on `http://localhost:8000`
- Frontend runs on `http://localhost:3000`
- Environment variables in `.env.local`

**Production (Netlify):**

- Everything runs on your Netlify domain
- Functions handle backend logic
- Environment variables in Netlify dashboard
