import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Typography, 
  Button, 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Tabs,
  Tab,
  Grid,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function GameDetails() {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [results, setResults] = useState([]);
  const [ratingHistory, setRatingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [isRefreshingRatings, setIsRefreshingRatings] = useState(false);

  // Define fetchGameData outside useEffect so it can be called from other functions
  const fetchGameData = async () => {
    try {
      setLoading(true);
      // Fetch game details
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', id)
        .single();
        
      if (gameError) throw gameError;
      setGame(gameData);

      // Fetch ratings for this game
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select(`
          id,
          value,
          trueskill_mean,
          trueskill_deviation,
          player_id,
          players (
            id,
            name
          )
        `)
        .eq('game_id', id)
        .order('value', { ascending: false });
        
      if (ratingsError) throw ratingsError;
      
      // Fetch results for this game
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select(`
          id,
          created_at,
          teams (
            id,
            rank,
            score
          )
        `)
        .eq('game_id', id)
        .order('created_at', { ascending: false });
        
      if (resultsError) throw resultsError;
      
      // For each team, fetch its players through memberships
      const resultsWithPlayers = await Promise.all(
        resultsData.map(async (result) => {
          const teamsWithPlayers = await Promise.all(
            result.teams.map(async (team) => {
              // Get memberships for this team
              const { data: memberships, error: membershipsError } = await supabase
                .from('memberships')
                .select(`
                  player_id,
                  players (
                    id,
                    name
                  )
                `)
                .eq('team_id', team.id);
              
              if (membershipsError) throw membershipsError;
              
              return {
                ...team,
                players: memberships.map(m => ({ id: m.player_id, name: m.players.name }))
              };
            })
          );
          
          return {
            ...result,
            teams: teamsWithPlayers
          };
        })
      );
      
      setResults(resultsWithPlayers);

      // If there are results but no ratings, automatically create ratings
      if (ratingsData.length === 0 && resultsWithPlayers.length > 0) {
        console.warn('Found results but no ratings for game ID:', id);
        
        // Get all player IDs from results
        const playerIds = new Set();
        for (const result of resultsWithPlayers) {
          for (const team of result.teams) {
            for (const player of team.players) {
              playerIds.add(player.id);
            }
          }
        }
        
        // Create ratings for each player
        const createdRatings = [];
        for (const playerId of playerIds) {
          // Check if player already has a rating for this game
          const { data: existingRating } = await supabase
            .from('ratings')
            .select('id')
            .eq('player_id', playerId)
            .eq('game_id', id)
            .single();
            
          // If no rating exists, create one with default values
          if (!existingRating) {
            console.log(`Creating missing rating for player ID ${playerId} in game ID ${id}`);
            
            // Create a new rating with default values
            // This is a placeholder - in a real system this would use the game's rating algorithm
            const defaultRating = 1000;
            const defaultMean = 25;
            const defaultDeviation = 8.333;
            
            const { data: newRating, error: createError } = await supabase
              .from('ratings')
              .insert({
                player_id: playerId,
                game_id: parseInt(id),
                value: defaultRating,
                trueskill_mean: defaultMean,
                trueskill_deviation: defaultDeviation,
                pro: false
              })
              .select(`
                id,
                value,
                trueskill_mean,
                trueskill_deviation,
                player_id,
                players (
                  id,
                  name
                )
              `);
              
            if (createError) {
              console.error('Error creating rating:', createError);
            } else if (newRating && newRating[0]) {
              createdRatings.push(newRating[0]);
            }
          }
        }
        
        // If we created any ratings, use them directly
        if (createdRatings.length > 0) {
          console.log(`Created ${createdRatings.length} missing ratings`);
          setRatings(createdRatings);
        } else {
          setRatings(ratingsData);
        }
      } else {
        setRatings(ratingsData);
      }
      
      // Fetch rating history
      const { data: historyData, error: historyError } = await supabase
        .from('rating_history_events')
        .select(`
          id,
          value,
          created_at,
          rating_id,
          trueskill_mean,
          trueskill_deviation
        `)
        .order('created_at');
        
      if (historyError) throw historyError;
      
      // Get ratings for these history events
      const historyWithRatings = await Promise.all(
        historyData.map(async (event) => {
          const { data: rating, error: ratingError } = await supabase
            .from('ratings')
            .select('player_id, game_id')
            .eq('id', event.rating_id)
            .single();
            
          if (ratingError) throw ratingError;
          
          // Only include events for this game
          if (rating.game_id !== parseInt(id)) {
            return null;
          }
          
          const { data: player, error: playerError } = await supabase
            .from('players')
            .select('id, name')
            .eq('id', rating.player_id)
            .single();
            
          if (playerError) throw playerError;
          
          return {
            ...event,
            ratings: {
              player_id: rating.player_id,
              players: player
            }
          };
        })
      );
      
      // Filter out null values (events from other games)
      const filteredHistory = historyWithRatings.filter(item => item !== null);
      
      // Process history data for chart
      const processedHistory = processHistoryData(filteredHistory);
      setRatingHistory(processedHistory);
      
    } catch (err) {
      console.error('Error fetching game data:', err);
      setError('Failed to load game data');
    } finally {
      setLoading(false);
    }
  };

  // Function to attempt to generate/refresh ratings
  const refreshRatings = async () => {
    if (isRefreshingRatings) return;
    
    try {
      setIsRefreshingRatings(true);
      
      // First, let's check if we need to create ratings for players
      const playerIds = new Set();
      
      // Collect all player IDs from results
      for (const result of results) {
        for (const team of result.teams) {
          for (const player of team.players) {
            playerIds.add(player.id);
          }
        }
      }
      
      // For each player, check if they have a rating and create if missing
      let playerRatings = {};
      for (const playerId of playerIds) {
        // Check if player already has a rating for this game
        const { data: existingRating } = await supabase
          .from('ratings')
          .select('*')
          .eq('player_id', playerId)
          .eq('game_id', id)
          .single();
          
        // If no rating exists, create one with default values
        if (!existingRating) {
          console.log(`Creating missing rating for player ID ${playerId} in game ID ${id}`);
          
          // Create a new rating with default values
          const defaultRating = 1000;
          const defaultMean = 25;
          const defaultDeviation = 8.333;
          
          const { data: newRating, error: createError } = await supabase
            .from('ratings')
            .insert({
              player_id: playerId,
              game_id: parseInt(id),
              value: defaultRating,
              trueskill_mean: defaultMean,
              trueskill_deviation: defaultDeviation,
              pro: false
            })
            .select();
            
          if (createError) {
            console.error('Error creating rating:', createError);
          } else if (newRating) {
            playerRatings[playerId] = newRating[0];
          }
        } else {
          playerRatings[playerId] = existingRating;
        }
      }
      
      // Now we need to recalculate ratings based on all the game results
      if (results.length > 0 && Object.keys(playerRatings).length > 0) {
        console.log('Recalculating ratings based on game results');
        
        // First, delete existing rating history events 
        if (results.length > 0) {
          for (const playerId in playerRatings) {
            const ratingId = playerRatings[playerId].id;
            
            // Delete existing history events
            const { error: deleteError } = await supabase
              .from('rating_history_events')
              .delete()
              .eq('rating_id', ratingId);
              
            if (deleteError) {
              console.error(`Error deleting history events for rating ${ratingId}:`, deleteError);
            }
          }
        }
        
        // Sort results by creation date (ascending)
        const sortedResults = [...results].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );
        
        // Process each result in chronological order
        for (const result of sortedResults) {
          await processResult(result, playerRatings, game.rating_type);
        }
        
        console.log('Ratings recalculated successfully');
      }
      
      // Reload the component data
      await fetchGameData();
      
    } catch (err) {
      console.error('Error refreshing ratings:', err);
      setError('An error occurred while refreshing ratings.');
    } finally {
      setIsRefreshingRatings(false);
    }
  };

  // Process a single result and update ratings
  const processResult = async (result, playerRatings, ratingType) => {
    try {
      const teams = result.teams.sort((a, b) => a.rank - b.rank);
      
      if (ratingType === 'elo') {
        // ELO is only for 1v1 games
        if (teams.length !== 2 || teams[0].players.length !== 1 || teams[1].players.length !== 1) {
          console.warn('ELO rating is only supported for 1v1 games');
          return;
        }
        
        const winnerId = teams[0].players[0].id;
        const loserId = teams[1].players[0].id;
        const isTie = teams[0].rank === teams[1].rank;
        
        // Get player ratings
        const winnerRating = playerRatings[winnerId];
        const loserRating = playerRatings[loserId];
        
        if (!winnerRating || !loserRating) {
          console.error('Missing player ratings');
          return;
        }
        
        // Calculate new ELO ratings
        const { newWinnerRating, newLoserRating } = calculateEloRating(
          winnerRating.value, 
          loserRating.value, 
          isTie
        );
        
        // Update winner's rating
        const { data: updatedWinner, error: winnerError } = await supabase
          .from('ratings')
          .update({ value: newWinnerRating })
          .eq('id', winnerRating.id)
          .select();
          
        if (winnerError) {
          console.error('Error updating winner rating:', winnerError);
        } else if (updatedWinner) {
          playerRatings[winnerId] = updatedWinner[0];
          
          // Create history event
          await supabase.from('rating_history_events').insert({
            rating_id: winnerRating.id,
            value: newWinnerRating,
            created_at: result.created_at
          });
        }
        
        // Update loser's rating
        const { data: updatedLoser, error: loserError } = await supabase
          .from('ratings')
          .update({ value: newLoserRating })
          .eq('id', loserRating.id)
          .select();
          
        if (loserError) {
          console.error('Error updating loser rating:', loserError);
        } else if (updatedLoser) {
          playerRatings[loserId] = updatedLoser[0];
          
          // Create history event
          await supabase.from('rating_history_events').insert({
            rating_id: loserRating.id,
            value: newLoserRating,
            created_at: result.created_at
          });
        }
      } else if (ratingType === 'trueskill') {
        // For TrueSkill, we need to process team-based ratings
        // This is a simplified TrueSkill implementation
        await processTrueSkillRatings(teams, playerRatings, result.created_at);
      }
    } catch (err) {
      console.error('Error processing result:', err);
    }
  };
  
  // Calculate new ELO ratings
  const calculateEloRating = (winnerRating, loserRating, isTie) => {
    const kFactor = 32;
    
    // Calculate expected scores
    const expectedWinner = 1.0 / (1.0 + Math.pow(10, (loserRating - winnerRating) / 400.0));
    const expectedLoser = 1.0 / (1.0 + Math.pow(10, (winnerRating - loserRating) / 400.0));
    
    let newWinnerRating, newLoserRating;
    
    if (isTie) {
      // If it's a tie, both players get 0.5
      newWinnerRating = Math.round(winnerRating + kFactor * (0.5 - expectedWinner));
      newLoserRating = Math.round(loserRating + kFactor * (0.5 - expectedLoser));
    } else {
      // Otherwise winner gets 1.0, loser gets 0.0
      newWinnerRating = Math.round(winnerRating + kFactor * (1.0 - expectedWinner));
      newLoserRating = Math.round(loserRating + kFactor * (0.0 - expectedLoser));
    }
    
    return { newWinnerRating, newLoserRating };
  };
  
  // Process TrueSkill ratings update
  const processTrueSkillRatings = async (teams, playerRatings, resultDate) => {
    try {
      // Group players by team to calculate team ratings
      const teamRatings = [];
      
      for (const team of teams) {
        const teamRank = team.rank;
        const teamScore = team.score || 0;
        const playerIds = team.players.map(p => p.id);
        let teamMean = 0;
        let teamVariance = 0;
        
        // Calculate team mean and variance
        for (const playerId of playerIds) {
          const playerRating = playerRatings[playerId];
          if (!playerRating) continue;
          
          teamMean += playerRating.trueskill_mean || 25;
          teamVariance += Math.pow(playerRating.trueskill_deviation || 8.333, 2);
        }
        
        // Normalize
        if (playerIds.length > 0) {
          teamMean /= playerIds.length;
          teamVariance /= Math.pow(playerIds.length, 2);
        }
        
        teamRatings.push({
          rank: teamRank,
          score: teamScore,
          mean: teamMean,
          variance: teamVariance,
          playerIds
        });
      }
      
      // Sort by rank
      teamRatings.sort((a, b) => a.rank - b.rank);
      
      // Process teams in order
      for (let i = 0; i < teamRatings.length - 1; i++) {
        const team1 = teamRatings[i];
        const team2 = teamRatings[i + 1];
        
        // Calculate skill difference
        const skillDiff = team1.mean - team2.mean;
        const beta = 4.166;
        
        // Calculate total variance (add dynamic factor for draws)
        const totalVariance = team1.variance + team2.variance + 2 * Math.pow(beta, 2);
        
        // Determine if it's a tie
        const isTie = team1.score === team2.score;
        const margin = isTie ? 0 : Math.sign(team1.score - team2.score);
        
        // Calculate win probability
        const winProbability = 0.5 * (1 + Math.sign(skillDiff) * 
          (1 - Math.exp(-Math.pow(skillDiff, 2) / (2 * totalVariance))));
          
        // Calculate factors for mean and deviation updates
        const v = skillDiff / Math.sqrt(totalVariance);
        const w = winProbability * (1 - winProbability);
        
        // Update players in both teams
        for (const team of [team1, team2]) {
          for (const playerId of team.playerIds) {
            const playerRating = playerRatings[playerId];
            if (!playerRating) continue;
            
            const playerMean = playerRating.trueskill_mean || 25;
            const playerDeviation = playerRating.trueskill_deviation || 8.333;
            
            // Calculate mean delta based on team outcome
            const sign = team === team1 ? 1 : -1;
            const meanDelta = (Math.pow(playerDeviation, 2) / Math.sqrt(totalVariance)) * margin * sign;
            
            // Calculate new mean and deviation
            const newPlayerMean = playerMean + meanDelta;
            const newPlayerDeviation = playerDeviation * 
              Math.sqrt(1 - (Math.pow(playerDeviation, 2) / totalVariance) * w);
              
            // Calculate conservative value (mean - 3*deviation)
            const newPlayerValue = Math.floor((newPlayerMean - 3 * newPlayerDeviation) * 100);
            
            // Update player rating
            const { data: updatedPlayer, error: updateError } = await supabase
              .from('ratings')
              .update({
                value: newPlayerValue,
                trueskill_mean: newPlayerMean,
                trueskill_deviation: newPlayerDeviation
              })
              .eq('id', playerRating.id)
              .select();
              
            if (updateError) {
              console.error(`Error updating rating for player ${playerId}:`, updateError);
            } else if (updatedPlayer) {
              playerRatings[playerId] = updatedPlayer[0];
              
              // Create history event
              await supabase.from('rating_history_events').insert({
                rating_id: playerRating.id,
                value: newPlayerValue,
                trueskill_mean: newPlayerMean,
                trueskill_deviation: newPlayerDeviation,
                created_at: resultDate
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error processing TrueSkill ratings:', err);
    }
  };

  useEffect(() => {
    fetchGameData();
  }, [id]);

  const processHistoryData = (historyData) => {
    const playerEvents = {};
    const dates = new Set();
    
    // Group events by player and collect all dates
    historyData.forEach(event => {
      const playerId = event.ratings.player_id;
      const playerName = event.ratings.players.name;
      const date = new Date(event.created_at).toLocaleDateString();
      
      dates.add(date);
      
      if (!playerEvents[playerName]) {
        playerEvents[playerName] = {};
      }
      
      playerEvents[playerName][date] = event.value;
    });
    
    // Fill in missing dates with previous values
    const sortedDates = Array.from(dates).sort((a, b) => new Date(a) - new Date(b));
    
    Object.keys(playerEvents).forEach(playerName => {
      let lastValue = null;
      sortedDates.forEach(date => {
        if (playerEvents[playerName][date] === undefined) {
          playerEvents[playerName][date] = lastValue;
        } else {
          lastValue = playerEvents[playerName][date];
        }
      });
    });
    
    // Format data for Recharts
    return sortedDates.map(date => {
      const dataPoint = { date };
      Object.keys(playerEvents).forEach(playerName => {
        dataPoint[playerName] = playerEvents[playerName][date];
      });
      return dataPoint;
    });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!game) return <Alert severity="warning">Game not found</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {game.name}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          component={RouterLink} 
          to={`/games/${id}/results/new`}
        >
          Record Result
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="textSecondary">Rating System</Typography>
              <Typography variant="body1">{game.rating_type.charAt(0).toUpperCase() + game.rating_type.slice(1)}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="textSecondary">Teams</Typography>
              <Typography variant="body1">
                {game.min_number_of_teams} - {game.max_number_of_teams || 'unlimited'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="textSecondary">Players Per Team</Typography>
              <Typography variant="body1">
                {game.min_number_of_players_per_team} - {game.max_number_of_players_per_team || 'unlimited'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">Ties Allowed</Typography>
              <Typography variant="body1">{game.allow_ties ? 'Yes' : 'No'}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Ratings" />
          <Tab label="Results" />
          <Tab label="Rating History" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {results.length > 0 && ratings.length === 0 ? (
          <Alert severity="warning">
            Results found but no ratings available. This may be a data synchronization issue.
          </Alert>
        ) : ratings.length === 0 ? (
          <Alert severity="info">No ratings yet. Record some results to see ratings.</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell align="right">Rating</TableCell>
                  <TableCell align="right">Wins</TableCell>
                  <TableCell align="right">Losses</TableCell>
                  {game.allow_ties && <TableCell align="right">Ties</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {ratings.map((rating) => (
                  <TableRow key={rating.id}>
                    <TableCell>
                      <RouterLink 
                        to={`/players/${rating.players.id}`} 
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <Typography color="primary">
                          {rating.players.name}
                        </Typography>
                      </RouterLink>
                    </TableCell>
                    <TableCell align="right">{rating.value}</TableCell>
                    <TableCell align="right">
                      {rating.players.wins ? rating.players.wins : 0}
                    </TableCell>
                    <TableCell align="right">
                      {rating.players.losses ? rating.players.losses : 0}
                    </TableCell>
                    {game.allow_ties && (
                      <TableCell align="right">
                        {rating.players.ties ? rating.players.ties : 0}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {results.length === 0 ? (
          <Alert severity="info">No results recorded yet.</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Winner(s)</TableCell>
                  <TableCell>Loser(s)</TableCell>
                  <TableCell>Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((result) => {
                  const winners = result.teams
                    .filter(team => team.rank === 1)
                    .flatMap(team => team.players);
                  
                  const losers = result.teams
                    .filter(team => team.rank > 1)
                    .flatMap(team => team.players);
                  
                  const scores = result.teams
                    .sort((a, b) => a.rank - b.rank)
                    .map(team => team.score)
                    .filter(score => score !== null)
                    .join(' - ');

                  return (
                    <TableRow key={result.id}>
                      <TableCell>{new Date(result.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{winners.map(p => p.name).join(', ')}</TableCell>
                      <TableCell>{losers.map(p => p.name).join(', ')}</TableCell>
                      <TableCell>{scores || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {ratingHistory.length === 0 ? (
          <Alert severity="info">No rating history available yet.</Alert>
        ) : (
          <Box sx={{ height: 400, width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={ratingHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(ratingHistory[0])
                  .filter(key => key !== 'date')
                  .map((player, index) => (
                    <Line 
                      key={player}
                      type="monotone" 
                      dataKey={player}
                      stroke={`hsl(${index * 30 % 360}, 70%, 50%)`}
                      activeDot={{ r: 8 }}
                    />
                  ))
                }
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </TabPanel>
    </Box>
  );
}

export default GameDetails; 