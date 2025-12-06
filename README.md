# Custom Board Data Generator

This is a React application built with Vite and TypeScript that generates custom board data. The app is designed to be deployed on Vercel and includes serverless API endpoints for data encryption/decryption.

View your app in AI Studio: https://ai.studio/apps/drive/14kHIVZdlXokFtP4lsNV3uGEJ4iGo4ADn

## Features

- Interactive location management with map integration
- Metadata form for board customization
- Data encryption/decryption functionality
- JSON export capabilities
- Vercel-optimized serverless API endpoints

## Run Locally

**Prerequisites:**
- Node.js (v18 or higher recommended)
- Vercel CLI (install with `npm install -g vercel`)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Copy `.env.sample` to `.env.local`
   - Set the `ENCRYPTION_KEY` in [.env.local](.env.local) to a secure random string for data encryption

3. Run the development server using Vercel CLI:
   ```bash
   vercel dev
   ```
   
   **Note:** This project is optimized for Vercel deployment, so we use `vercel dev` instead of `npm run dev` to properly simulate the production environment including serverless functions.

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

## Deployment

This project is configured to deploy automatically to Vercel when changes are pushed to the main branch through Vercel's Git integration.

### Initial Setup:
1. Connect your repository to Vercel through the Vercel dashboard
2. Ensure the `ENCRYPTION_KEY` environment variable is set in your Vercel project settings
3. Deploy by pushing to the main branch

The app will automatically deploy serverless API functions located in the `/api` directory.
