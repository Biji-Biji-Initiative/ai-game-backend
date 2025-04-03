# Deploying Your Multi-Project Workspace to Vercel

This guide will walk you through deploying all your projects (frontend, backend, admin, api-tester-ui) to Vercel from a single repository.

## Step 1: Set Up Vercel CLI

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

## Step 2: Create Vercel Projects

### Backend API

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Initialize Vercel project:
   ```bash
   vercel
   ```
   - Select "Set up and deploy"
   - Confirm the directory is correct
   - Choose to link to an existing project or create new
   - Name it something like "your-app-api"
   - Set the production domain to "api.yourdomain.com"

3. Set environment variables:
   ```bash
   vercel env add
   ```
   Add all variables from your backend/.env file

### Frontend App

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Initialize Vercel project:
   ```bash
   vercel
   ```
   - Name it something like "your-app-frontend"
   - Set the production domain to "app.yourdomain.com"

3. Set environment variables:
   ```bash
   vercel env add
   ```
   Make sure to set `NEXT_PUBLIC_API_URL` to point to your backend URL

### Admin Dashboard

1. Navigate to the admin directory:
   ```bash
   cd ../admin
   ```

2. Initialize Vercel project:
   ```bash
   vercel
   ```
   - Name it something like "your-app-admin"
   - Set the production domain to "admin.yourdomain.com"

3. Set environment variables:
   ```bash
   vercel env add
   ```

### API Tester UI (if needed)

1. Navigate to the api-tester-ui directory:
   ```bash
   cd ../api-tester-ui
   ```

2. Initialize Vercel project:
   ```bash
   vercel
   ```
   - Name it something like "your-app-tester"
   - Set the production domain to "tester.yourdomain.com"

## Step 3: Connect Your Projects

### Update API URLs

1. In your frontend project's vercel.json, update the API URL:
   ```json
   "rewrites": [
     { 
       "source": "/api/:path*", 
       "destination": "https://api.yourdomain.com/api/:path*" 
     }
   ],
   "env": {
     "NEXT_PUBLIC_API_URL": "https://api.yourdomain.com/api"
   }
   ```

2. Do the same for admin/vercel.json

## Step 4: Set Up Environment Variables

### Using Environment Variable Groups

1. Create a shared environment group:
   ```bash
   vercel env pull --scope your-team
   vercel env add SHARED_SECRET --scope your-team
   ```

2. Link each project to use this group:
   ```bash
   cd frontend
   vercel link
   vercel env pull
   ```

3. Repeat for each project

## Step 5: Configure Domains

1. Add custom domains in Vercel dashboard:
   - Frontend: app.yourdomain.com
   - Backend: api.yourdomain.com
   - Admin: admin.yourdomain.com
   - API Tester: tester.yourdomain.com

2. Configure DNS settings with your domain provider

## Step 6: Deploy to Production

1. Deploy each project to production:
   ```bash
   cd backend
   vercel --prod
   
   cd ../frontend
   vercel --prod
   
   cd ../admin
   vercel --prod
   
   cd ../api-tester-ui
   vercel --prod
   ```

## Step 7: Set Up GitHub Integration

1. Connect your GitHub repository in the Vercel dashboard
2. Configure auto-deployment settings for each project
3. Set up branch deployments if needed

## Continuous Deployment

For future deployments, commit and push to GitHub:
```bash
git add .
git commit -m "Update features"
git push
```

Vercel will automatically deploy changes to the respective projects.

## Troubleshooting

### Common Issues

1. **Cross-Origin (CORS) errors**:
   - Ensure backend has proper CORS headers
   - Update allowed origins in backend to include all frontend domains

2. **Environment variables not working**:
   - Verify they are set correctly in Vercel dashboard
   - For Next.js, ensure client-side variables have NEXT_PUBLIC_ prefix

3. **Deployment failures**:
   - Check build logs in Vercel dashboard
   - Ensure all dependencies are correctly listed in package.json

For additional support, check Vercel documentation or contact their support team. 