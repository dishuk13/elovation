import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import AddIcon from '@mui/icons-material/Add';

function GamesList() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchGames() {
      try {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setGames(data);
      } catch (err) {
        console.error('Error fetching games:', err);
        setError('Failed to fetch games');
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
  }, []);

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Games
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          component={RouterLink} 
          to="/games/new"
          startIcon={<AddIcon />}
        >
          New Game
        </Button>
      </Box>

      {games.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1">
              No games found. Create your first game to get started!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Rating Type</TableCell>
                <TableCell>Teams</TableCell>
                <TableCell>Players Per Team</TableCell>
                <TableCell>Ties Allowed</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {games.map((game) => (
                <TableRow key={game.id}>
                  <TableCell>
                    <RouterLink to={`/games/${game.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <Typography color="primary" sx={{ fontWeight: 'bold' }}>
                        {game.name}
                      </Typography>
                    </RouterLink>
                  </TableCell>
                  <TableCell>{game.rating_type}</TableCell>
                  <TableCell>
                    {game.min_number_of_teams} - {game.max_number_of_teams || 'unlimited'}
                  </TableCell>
                  <TableCell>
                    {game.min_number_of_players_per_team} - {game.max_number_of_players_per_team || 'unlimited'}
                  </TableCell>
                  <TableCell>{game.allow_ties ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      component={RouterLink} 
                      to={`/games/${game.id}/results/new`}
                    >
                      New Result
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default GamesList; 