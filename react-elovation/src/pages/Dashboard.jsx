import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { checkSchemaAccess } from '../lib/checkSchemaAccess';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';

function Dashboard() {
  const [games, setGames] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch games
        const { data: gamesData, error: gamesError } = await supabase
          .from('games')
          .select('*')
          .order('updated_at', { ascending: false });

        if (gamesError) throw gamesError;
        setGames(gamesData);

        // Fetch recent results with player data
        const { data: resultsData, error: resultsError } = await supabase
          .from('results')
          .select(`
            id, 
            created_at,
            game_id,
            games(name)
          `)
          .order('created_at', { ascending: false });

        if (resultsError) throw resultsError;
        
        // Now get the teams for each result
        const resultsWithTeams = await Promise.all(
          resultsData.map(async (result) => {
            const { data: teamsData, error: teamsError } = await supabase
              .from('teams')
              .select('id, rank, score')
              .eq('result_id', result.id);
              
            if (teamsError) throw teamsError;
            
            // For each team, get its players through memberships
            const teamsWithPlayers = await Promise.all(
              teamsData.map(async (team) => {
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
                  players: memberships.map(m => ({
                    id: m.player_id,
                    name: m.players.name
                  }))
                };
              })
            );
            
            return {
              ...result,
              teams: teamsWithPlayers
            };
          })
        );
        
        setRecentResults(resultsWithTeams);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const handleDebugClick = async () => {
    const result = await checkSchemaAccess();
    alert(result);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleDebugClick}
            sx={{ mr: 2 }}
          >
            Debug Schema
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            component={RouterLink} 
            to="/games/new"
          >
            New Game
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Games
              </Typography>
              {games.length > 0 ? (
                <List>
                  {games.map((game) => (
                    <ListItem key={game.id} disablePadding divider>
                      <ListItemText 
                        primary={game.name} 
                        secondary={`Rating type: ${game.rating_type}`} 
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography>No games found</Typography>
              )}
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                component={RouterLink} 
                to="/games"
              >
                View All Games
              </Button>
              <Button 
                size="small" 
                component={RouterLink} 
                to="/games/new"
                color="primary"
              >
                New Game
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Results
              </Typography>
              {recentResults.length > 0 ? (
                <List>
                  {recentResults.map((result) => {
                    const winners = result.teams
                      .filter(team => team.rank === 1)
                      .flatMap(team => team.players);
                    const losers = result.teams
                      .filter(team => team.rank > 1)
                      .flatMap(team => team.players);
                    
                    return (
                      <ListItem key={result.id} disablePadding divider>
                        <ListItemText 
                          primary={
                            <>
                              {winners.map(p => p.name).join(', ')} defeated {losers.map(p => p.name).join(', ')}
                            </>
                          } 
                          secondary={`${result.games.name} - ${new Date(result.created_at).toLocaleDateString()}`} 
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Typography>No recent results</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard; 