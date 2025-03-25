# Deployment Instructions

This document provides detailed instructions for deploying the MLB Betting Recommendation System.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Deployment Options](#deployment-options)
4. [API Integration Setup](#api-integration-setup)
5. [Google Sheets Integration](#google-sheets-integration)
6. [Database Setup](#database-setup)
7. [Maintenance and Monitoring](#maintenance-and-monitoring)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying the application, ensure you have:

- Node.js 20.x or higher
- npm or yarn package manager
- Access to a PostgreSQL database (optional, file-based storage also available)
- The following API keys:
  - The Odds API key (for live MLB game data)
  - OpenAI API key (for recommendation generation)
  - Google Cloud credentials (for Google Sheets integration, optional)

## Environment Setup

The application requires several environment variables to be configured:

```
# Core Application Settings
NODE_ENV=production
PORT=5000

# API Keys
ODDS_API_KEY=your_odds_api_key
OPENAI_API_KEY=your_openai_api_key

# Database Connection (if using PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database

# Google Integration (if using Google Sheets API)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### Setting Up Environment Variables

1. Create a `.env` file in the root directory of the project
2. Add the required environment variables listed above
3. For production deployments, use the appropriate method for your hosting provider to set these securely

## Deployment Options

### Option 1: Replit (Easiest)

The application is designed to be deployed directly to Replit:

1. Create a new Replit from your forked repository
2. Set up the required environment variables in the Replit Secrets tab
3. Click the "Deploy" button in the Replit interface
4. The application will be available at your Replit URL

### Option 2: Traditional Hosting

To deploy to a traditional hosting environment:

1. Clone the repository to your server
2. Install dependencies:
   ```
   npm install
   ```
3. Build the application:
   ```
   npm run build
   ```
4. Start the application:
   ```
   npm run start
   ```

### Option 3: Docker Deployment

For Docker-based deployments:

1. Build the Docker image:
   ```
   docker build -t mlb-betting-app .
   ```
2. Run the container:
   ```
   docker run -p 5000:5000 --env-file .env mlb-betting-app
   ```

## API Integration Setup

### The Odds API Setup

1. Sign up for an account at [The Odds API](https://the-odds-api.com/)
2. Get your API key from the dashboard
3. Set the `ODDS_API_KEY` environment variable with your key

### OpenAI API Setup

1. Sign up for an account at [OpenAI](https://openai.com/)
2. Create an API key from the dashboard
3. Set the `OPENAI_API_KEY` environment variable with your key

## Google Sheets Integration

The application offers two methods for Google Sheets integration:

### Option 1: Google Apps Script (Simpler Method)

1. Create a new Google Sheet where you want to export the recommendations
2. In the Google Sheet, go to Extensions > Apps Script
3. Copy and paste the script from `docs/google-apps-script-solution.js` into the script editor
4. Save the script and deploy it as a web app:
   - Click "Deploy" > "New deployment"
   - Select "Web app" for deployment type
   - Set "Who has access" to "Anyone" or "Anyone with Google Account"
   - Click "Deploy" and authorize when prompted
5. Copy the deployment URL
6. In the MLB Betting App, go to Settings > Direct Integration and paste the URL

### Option 2: Google Sheets API (Advanced Method)

For a more robust integration:

1. Create a Google Cloud Project
2. Enable the Google Sheets API
3. Create service account credentials with appropriate permissions
4. Download the service account key JSON file
5. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of this file
6. Share your target Google Sheet with the service account email

## Database Setup

The application supports two storage methods:

### Option 1: File-Based Storage (Default)

By default, the application uses file-based storage in the `./data` directory. No additional setup is required.

### Option 2: PostgreSQL Database

For production environments, a PostgreSQL database is recommended:

1. Create a PostgreSQL database
2. Set the `DATABASE_URL` environment variable with your connection string
3. Run database migrations:
   ```
   npm run db:push
   ```

## Maintenance and Monitoring

### Daily Data Refresh

The application includes a scheduler for daily data refreshes:

1. Configure the refresh time in the Settings page
2. The application will automatically fetch new game data and generate recommendations at the specified time
3. For production, ensure your server has the appropriate timezone set

### Logging

Application logs are available:

1. In the console during development
2. In the Logs page of the application

## Troubleshooting

### Common Issues

1. **API Keys Not Working**
   - Verify the keys are correctly set in environment variables
   - Check API usage limits and quotas

2. **Data Not Refreshing**
   - Ensure the scheduler is properly configured
   - Check server timezone settings match your expected refresh times

3. **Google Sheets Integration Failing**
   - Verify the sheet is shared with the service account
   - Check that the web app URL is correctly configured

### Support

For further assistance, contact the development team.