# Deploying Frontend to Vercel

This guide will help you deploy the React frontend to Vercel with environment variables configured as secrets.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed (optional, but recommended)
3. Git repository (Vercel can connect to GitHub, GitLab, or Bitbucket)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Sign in or create an account

2. **Import Your Project**
   - Click "Add New..." → "Project"
   - Import your Git repository (GitHub/GitLab/Bitbucket)
   - Or drag and drop the `frontend` folder

3. **Configure Project Settings**
   - **Framework Preset**: Create React App (auto-detected)
   - **Root Directory**: `frontend` (if deploying from monorepo root)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `build` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

4. **Add Environment Variable as Secret**
   - Go to Project Settings → Environment Variables
   - Click "Add New"
   - **Key**: `REACT_APP_API_URL`
   - **Value**: `https://aromapureair-backend-163262250816.asia-south2.run.app/api`
   - Select environments: Production, Preview, Development (all)
   - Click "Save"

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at a URL like `https://your-app.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Navigate to Frontend Directory**
   ```bash
   cd frontend
   ```

4. **Deploy to Vercel**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new
   - Confirm settings
   - Deploy to production? (y/n)

5. **Set Environment Variable**
   ```bash
   vercel env add REACT_APP_API_URL
   ```
   
   When prompted:
   - Enter the value: `https://aromapureair-backend-163262250816.asia-south2.run.app/api`
   - Select environments: Production, Preview, Development

6. **Redeploy to Apply Environment Variables**
   ```bash
   vercel --prod
   ```

## Environment Variable Configuration

### Using Vercel Dashboard:

1. Go to your project on Vercel
2. Click on **Settings** → **Environment Variables**
3. Add the following:

| Name | Value | Environments |
|------|-------|--------------|
| `REACT_APP_API_URL` | `https://aromapureair-backend-163262250816.asia-south2.run.app/api` | Production, Preview, Development |

4. Click **Save**
5. Redeploy your application for changes to take effect

### Using Vercel CLI:

```bash
# Add environment variable
vercel env add REACT_APP_API_URL production
vercel env add REACT_APP_API_URL preview
vercel env add REACT_APP_API_URL development

# Pull environment variables (optional, for local development)
vercel env pull .env.local
```

## Important Notes

1. **Never commit `.env` files** - They are already in `.gitignore`
2. **Environment variables are build-time** - They are embedded into the JavaScript bundle during build
3. **Redeploy after changes** - Any changes to environment variables require a new deployment
4. **Security** - While the API URL is in the bundle, console sanitization hides it from logs

## Verifying Deployment

1. After deployment, visit your Vercel URL
2. Open browser DevTools (F12)
3. Check the Network tab - API requests should go to your Cloud Run backend
4. Check Console - API URLs should be sanitized (replaced with `[API_URL]`)

## Troubleshooting

### Build Fails with "REACT_APP_API_URL not defined"
- Ensure the environment variable is set in Vercel dashboard
- Check that it's enabled for the correct environment (Production/Preview/Development)
- Redeploy the application

### CORS Errors
- Make sure your backend CORS configuration allows your Vercel domain
- Update `ALLOWED_ORIGINS` in backend environment to include: `https://your-app.vercel.app`

### API Calls Fail
- Verify the backend URL in the environment variable is correct
- Check that the backend is deployed and accessible
- Ensure CORS is properly configured on the backend

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update backend CORS to include your custom domain

