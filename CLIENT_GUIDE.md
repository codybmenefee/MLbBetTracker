# MLB Betting Recommendation System - Client Guide

Welcome to your new MLB Betting Recommendation System! This guide will help you get started and make the most of the application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Using the Application](#using-the-application)
3. [Setting Up API Keys](#setting-up-api-keys)
4. [Google Sheets Integration](#google-sheets-integration)
5. [Best Practices](#best-practices)
6. [FAQ](#faq)

## Getting Started

Your MLB Betting Recommendation System is accessible at the URL provided to you. Simply navigate to this URL in your web browser to access the application.

### First-Time Setup

When you first access the application, you'll need to:

1. Configure your API keys (see [Setting Up API Keys](#setting-up-api-keys))
2. Set up Google Sheets integration (optional, see [Google Sheets Integration](#google-sheets-integration))
3. Configure your initial bankroll (on the Bankroll page)

## Using the Application

The application is organized into several main sections, accessible from the sidebar:

### Schedule Page

This is where you can view and manage MLB game data:

1. **View Games**: See all currently loaded games with their odds
2. **Upload Games**: Upload game data from CSV, Word, or text files
3. **Fetch Live Games**: If you have an Odds API key, fetch live MLB game data with current odds
4. **Generate Recommendations**: Create new betting recommendations based on the loaded games

#### Tips for Schedule Page

- You can upload a CSV file with game data following the template provided in the app
- For text file uploads, list games in a "Team A vs Team B" format, one per line
- Clicking "Refresh Games" with The Odds API configured will fetch the latest game data

### Recommendations Page

Here you can view, analyze, and export betting recommendations:

1. **View Recommendations**: See all generated recommendations with details
2. **Copy to Clipboard**: Copy recommendations in a format ready for spreadsheets
3. **Export to Google Sheets**: Send recommendations directly to your configured Google Sheet
4. **Place Bets**: Log bets you place based on recommendations to track performance

#### Tips for Recommendations Page

- Click on a recommendation to see detailed analysis
- Use the confidence score to prioritize which bets to consider
- Export to Google Sheets to share with your team or keep an external record

### Bankroll Page

Manage your betting funds and track your betting history:

1. **Set Bankroll**: Configure your initial and current bankroll amount
2. **View Bet History**: See all bets you've logged, including wins and losses
3. **Record Bets**: Log new bets you've placed
4. **Update Results**: Record the outcomes of your bets
5. **Export Data**: Download your betting history as a CSV file

#### Tips for Bankroll Page

- Regularly update bet results to keep your bankroll tracking accurate
- Use the performance metrics to analyze your betting strategy
- Consider the bankroll recommendations when deciding bet sizes

### Settings Page

Configure application settings and integrations:

1. **Google Sheets Integration**: Set up automatic exports to Google Sheets
2. **Schedule Settings**: Configure automatic daily refresh times
3. **API Configuration**: Manage your API keys (if not using environment variables)

## Setting Up API Keys

The application requires two API keys for full functionality:

### The Odds API

This API provides live MLB game data and odds:

1. Sign up at [The Odds API](https://the-odds-api.com/)
2. Get your API key from the dashboard
3. Enter the key in the application's Settings page or provide it to your administrator for configuration

### OpenAI API

This API powers the AI recommendation engine:

1. Sign up at [OpenAI](https://openai.com/)
2. Create an API key from the dashboard
3. Enter the key in the application's Settings page or provide it to your administrator for configuration

## Google Sheets Integration

The application can automatically export recommendations to Google Sheets:

### Quick Setup (Google Apps Script)

1. Create a new Google Sheet where you want to export recommendations
2. Go to the Settings page in the application
3. Follow the step-by-step instructions to set up the Google Apps Script integration
4. Once configured, you can export recommendations with a single click

### Using Exported Data

The exported data in Google Sheets will contain:

- Game matchups
- Bet types
- Odds
- Confidence levels
- Predictions and analysis

You can then use this data for:
- Further analysis
- Team sharing
- Historical tracking
- Custom reporting

## Best Practices

To get the most from your MLB Betting Recommendation System:

1. **Regular Updates**: Fetch fresh game data daily for the most accurate odds
2. **Record All Bets**: Track all bets placed to get accurate performance metrics
3. **Review Analysis**: Read the AI analysis to understand the reasoning behind recommendations
4. **Compare Sources**: Use the recommendations as one tool in your overall betting strategy
5. **Manage Bankroll**: Follow bankroll management principles to protect your investment

## FAQ

**Q: How often should I generate new recommendations?**  
A: For best results, generate new recommendations daily as odds can change frequently.

**Q: Can I customize the recommendation criteria?**  
A: The current version uses a fixed AI model for recommendations. Future versions may include customization options.

**Q: What happens if the APIs are temporarily unavailable?**  
A: The application will store your most recent data and continue functioning with that data until new data can be fetched.

**Q: How secure is my betting data?**  
A: Your data is stored securely on your deployment and is not shared with third parties.

**Q: Can multiple users access the application?**  
A: Yes, depending on your deployment method, multiple users can access the application simultaneously.

---

For additional support, please contact your account representative or technical support contact provided during onboarding.