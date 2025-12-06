# Custom Board Data Generator

This is a React application built with Vite and TypeScript that generates custom board data. The app is designed to be deployed on Vercel and includes serverless API endpoints for data encryption/decryption.

View your app in AI Studio: https://ai.studio/apps/drive/14kHIVZdlXokFtP4lsNV3uGEJ4iGo4ADn

## Features

- Interactive location management with map integration
- Metadata form for board customization
- Data encryption/decryption functionality
- JSON export capabilities
- Vercel-optimized serverless API endpoints

## Development Setup

This project includes a dev container configuration for a consistent development environment.

### Option 1: Dev Container (Recommended)

**Prerequisites:**
- [Visual Studio Code](https://code.visualstudio.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) for VS Code

**Setup:**
1. Clone the repository
2. Open the project in VS Code
3. When prompted, click "Reopen in Container" or use the Command Palette (`Ctrl+Shift+P`) and select "Dev Containers: Reopen in Container"
4. The dev container will automatically:
   - Set up Node.js and TypeScript environment
   - Install Vercel CLI
   - Install all project dependencies (`npm install`)

### Option 2: Local Development

**Prerequisites:**
- Node.js (v18 or higher recommended)
- Vercel CLI (install with `npm install -g vercel`)

**Setup:**
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Environment Configuration

Set up environment variables:
- Copy `.env.sample` to `.env.local`
- Set the `ENCRYPTION_KEY` in `.env.local` to a secure random string for data encryption

## Running the Development Server

Run the development server using Vercel CLI:
```bash
vercel dev
```

**Note:** This project is optimized for Vercel deployment, so we use `vercel dev` instead of `npm run dev` to properly simulate the production environment including serverless functions.

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

## Deployment

This project is configured to deploy automatically to Vercel when changes are pushed to the main branch through Vercel's Git integration.

### Initial Setup:
1. Connect your repository to Vercel through the Vercel dashboard
2. Ensure the `ENCRYPTION_KEY` environment variable is set in your Vercel project settings
3. Deploy by pushing to the main branch

The app will automatically deploy serverless API functions located in the `/api` directory.
