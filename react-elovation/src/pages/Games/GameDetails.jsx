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

  useEffect(() => {
    async function fetchGameData() {
      try {
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
            player_id
          `)
          .eq('game_id', id)
          .order('value', { ascending: false });
          
        if (ratingsError) throw ratingsError;
        
        // Fetch the player details for each rating
        const ratingsWithPlayers = await Promise.all(
          ratingsData.map(async (rating) => {
            const { data: player, error: playerError } = await supabase
              .from('players')
              .select('id, name')
              .eq('id', rating.player_id)
              .single();
            
            if (playerError) throw playerError;
            
            return {
              ...rating,
              players: player
            };
          })
        );
        
        setRatings(ratingsWithPlayers);

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
    }

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
        {ratings.length === 0 ? (
          <Alert severity="info">No ratings yet. Record some results to see ratings.</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Player</TableCell>
                  <TableCell align="right">Rating</TableCell>
                  {game.rating_type === 'trueskill' && (
                    <>
                      <TableCell align="right">Mean</TableCell>
                      <TableCell align="right">Deviation</TableCell>
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {ratings.map((rating, index) => (
                  <TableRow key={rating.id}>
                    <TableCell>{index + 1}</TableCell>
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
                    {game.rating_type === 'trueskill' && (
                      <>
                        <TableCell align="right">{rating.trueskill_mean?.toFixed(1) || '-'}</TableCell>
                        <TableCell align="right">{rating.trueskill_deviation?.toFixed(1) || '-'}</TableCell>
                      </>
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
                    .filter(team => team.rank === 0)
                    .flatMap(team => team.players);
                  
                  const losers = result.teams
                    .filter(team => team.rank > 0)
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