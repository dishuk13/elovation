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
  Card,
  CardContent,
  Grid,
  Alert,
  Tabs,
  Tab,
  Divider
} from '@mui/material';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function PlayerDetails() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    async function fetchPlayerData() {
      try {
        // Fetch player details
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('id', id)
          .single();
          
        if (playerError) throw playerError;
        setPlayer(playerData);

        // Fetch ratings for this player
        const { data: ratingsData, error: ratingsError } = await supabase
          .from('ratings')
          .select(`
            id,
            value,
            trueskill_mean,
            trueskill_deviation,
            games (id, name, rating_type)
          `)
          .eq('player_id', id)
          .order('value', { ascending: false });
          
        if (ratingsError) throw ratingsError;
        setRatings(ratingsData);
      } catch (err) {
        console.error('Error fetching player data:', err);
        setError('Failed to load player data');
      } finally {
        setLoading(false);
      }
    }

    fetchPlayerData();
  }, [id]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!player) return <Alert severity="warning">Player not found</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {player.name}
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">Email</Typography>
              <Typography variant="body1">{player.email || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">Joined</Typography>
              <Typography variant="body1">
                {new Date(player.created_at).toLocaleDateString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Ratings" />
          <Tab label="Match History" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {ratings.length === 0 ? (
          <Alert severity="info">No ratings yet for this player.</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Game</TableCell>
                  <TableCell align="right">Rating</TableCell>
                  <TableCell align="right">Mean</TableCell>
                  <TableCell align="right">Deviation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ratings.map((rating) => (
                  <TableRow key={rating.id}>
                    <TableCell>
                      <RouterLink 
                        to={`/games/${rating.games.id}`} 
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <Typography color="primary" sx={{ fontWeight: 'bold' }}>
                          {rating.games.name}
                        </Typography>
                      </RouterLink>
                    </TableCell>
                    <TableCell align="right">{Math.round(rating.value)}</TableCell>
                    <TableCell align="right">
                      {rating.trueskill_mean ? Math.round(rating.trueskill_mean) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {rating.trueskill_deviation ? Math.round(rating.trueskill_deviation) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Alert severity="info">Match history feature coming soon.</Alert>
      </TabPanel>
    </Box>
  );
}

export default PlayerDetails; 