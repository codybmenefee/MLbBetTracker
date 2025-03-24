import axios from 'axios';
import { InsertGame } from '@shared/schema';

// Interface for The Odds API response
interface OddsApiResponse {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

interface Market {
  key: string;
  last_update: string;
  outcomes: Outcome[];
}

interface Outcome {
  name: string;
  price: number;
  point?: number;
}

/**
 * Fetches MLB games data from The Odds API
 * @param apiKey The Odds API key
 * @returns Array of games in our application format
 */
export async function fetchMLBGames(apiKey: string): Promise<InsertGame[]> {
  try {
    // The Odds API endpoint for MLB games
    const url = 'https://api.the-odds-api.com/v4/sports/baseball_mlb/odds';
    
    // Make the request to The Odds API
    const response = await axios.get<OddsApiResponse[]>(url, {
      params: {
        apiKey: apiKey,
        regions: 'us',
        markets: 'h2h,totals',
        oddsFormat: 'american',
        dateFormat: 'iso'
      }
    });
    
    // Transform API response to our application's format
    return transformOddsApiResponse(response.data);
  } catch (error) {
    console.error('Error fetching MLB games from The Odds API:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      
      throw new Error(`The Odds API error (${status}): ${message}`);
    }
    
    throw error;
  }
}

/**
 * Transforms The Odds API response to our application's game format
 * @param apiResponse Response from The Odds API
 * @returns Array of games in our application format
 */
function transformOddsApiResponse(apiResponse: OddsApiResponse[]): InsertGame[] {
  return apiResponse.map(game => {
    // Default values
    let homeOdds = 'N/A';
    let awayOdds = 'N/A';
    let overUnderLine = 'N/A';
    let overUnderOdds = 'N/A';
    
    // Get odds from DraftKings if available, otherwise use the first bookmaker
    const draftKings = game.bookmakers.find(b => b.key === 'draftkings') || game.bookmakers[0];
    
    if (draftKings) {
      // Extract moneyline odds
      const h2hMarket = draftKings.markets.find(m => m.key === 'h2h');
      if (h2hMarket) {
        const homeOutcome = h2hMarket.outcomes.find(o => o.name === game.home_team);
        const awayOutcome = h2hMarket.outcomes.find(o => o.name === game.away_team);
        
        if (homeOutcome) {
          homeOdds = homeOutcome.price > 0 ? `+${homeOutcome.price}` : `${homeOutcome.price}`;
        }
        
        if (awayOutcome) {
          awayOdds = awayOutcome.price > 0 ? `+${awayOutcome.price}` : `${awayOutcome.price}`;
        }
      }
      
      // Extract over/under odds
      const totalsMarket = draftKings.markets.find(m => m.key === 'totals');
      if (totalsMarket && totalsMarket.outcomes.length > 0) {
        const overOutcome = totalsMarket.outcomes.find(o => o.name === 'Over');
        
        if (overOutcome) {
          overUnderLine = overOutcome.point ? `${overOutcome.point}` : 'N/A';
          overUnderOdds = overOutcome.price > 0 ? `+${overOutcome.price}` : `${overOutcome.price}`;
        }
      }
    }
    
    // Create game object in our application's format
    return {
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      gameTime: new Date(game.commence_time),
      homeOdds,
      awayOdds,
      overUnderLine,
      overUnderOdds,
      source: 'The Odds API'
    };
  });
}

/**
 * Refreshes MLB games data from The Odds API and stores it
 * @param apiKey The Odds API key
 * @param storeGames Function to store games in our application
 * @returns Array of stored games
 */
export async function refreshMLBGames(
  apiKey: string, 
  storeGames: (games: InsertGame[]) => Promise<any>
): Promise<any> {
  try {
    const games = await fetchMLBGames(apiKey);
    
    if (games.length === 0) {
      console.log('No MLB games found from The Odds API.');
      return [];
    }
    
    // Store the games in our application
    return await storeGames(games);
  } catch (error) {
    console.error('Error refreshing MLB games:', error);
    throw error;
  }
}