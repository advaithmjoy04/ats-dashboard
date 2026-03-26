# Vercel Deployment

This project is prepared for a single-repo Vercel deployment:

- React frontend served from `client/dist`
- Express backend exposed through `api/index.js`

## Before deploy

Rotate any secrets that were previously exposed during local debugging:

- MongoDB password
- AWS access key and secret
- Gmail app password

## Required Vercel environment variables

Set these in the Vercel project settings for Production and Preview as needed:

```env
NODE_ENV=production
PORT=3001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_ORIGIN=https://your-vercel-domain.vercel.app
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
AWS_REGION=your_aws_region
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your_s3_bucket_name
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM=ATS Platform <yourgmail@gmail.com>
```

If you add a custom domain, include it in `ALLOWED_ORIGINS` as a comma-separated value.

Example:

```env
ALLOWED_ORIGINS=https://ats.example.com,https://your-vercel-domain.vercel.app
```

## Vercel project settings

Use:

- Framework Preset: `Other`
- Root Directory: project root
- Build Command: picked up from `vercel.json`
- Output Directory: picked up from `vercel.json`

## Security checks

Before promoting to production:

1. Confirm `NODE_ENV=production`
2. Confirm `ALLOWED_ORIGINS` only includes trusted frontend domains
3. Confirm MongoDB IP/network access is restricted appropriately
4. Confirm S3 bucket public access is blocked
5. Confirm Gmail uses an App Password, not the main account password
6. Confirm no secrets are committed to GitHub
7. Confirm invite, reset-password, and resume upload flows work on the deployed domain

## Notes

- Resume uploads depend on S3 being configured correctly.
- Password reset and invite emails depend on Gmail SMTP being configured correctly.
- The backend runs as a Vercel serverless function through `/api`.
