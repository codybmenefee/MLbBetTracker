# MLB Betting Recommendation System

An AI-powered MLB betting recommendation and tracking application that generates intelligent daily betting insights and seamlessly exports data to Google Sheets.

## Overview

This application helps sports analysts and bettors make informed decisions on MLB games by:

1. Fetching the latest MLB games and odds from The Odds API
2. Generating AI-powered betting recommendations
3. Exporting recommendations to Google Sheets for easy sharing and analysis
4. Tracking bankroll and bet history for performance analysis
5. Providing automated daily refreshes of game data and recommendations

## Key Features

- **Live Odds Dashboard**: View the latest MLB games and odds
- **AI-Powered Recommendations**: Generate betting recommendations using advanced AI analysis
- **Google Sheets Integration**: Seamlessly export recommendations to Google Sheets
- **Bankroll Management**: Track your betting bankroll and performance
- **Bet History**: Log and analyze your betting history
- **Automated Scheduling**: Set daily refresh times for game data and recommendations
- **CSV Import/Export**: Import games from CSV files and export bet history

## Technology Stack

- **Frontend**: React, TanStack Query, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express
- **Data Storage**: Supports both file-based storage and PostgreSQL database
- **External APIs**: OpenAI API, The Odds API
- **Integrations**: Google Sheets API, Google Apps Script

## Getting Started

See the [Deployment Instructions](DEPLOYMENT.md) for details on how to set up and deploy this application.

## Usage

1. **Schedule Page**: Upload game data or use The Odds API to fetch the latest games
2. **Recommendations Page**: Generate and view betting recommendations
3. **Bankroll Page**: Manage your bankroll and track bets
4. **Settings Page**: Configure Google Sheets integration and automation settings

## External API Requirements

This application requires the following API keys:

- **The Odds API**: For fetching live MLB game data and odds
- **OpenAI API**: For generating AI-powered betting recommendations

## Support

For questions or issues, please contact the development team.

## License

MIT License