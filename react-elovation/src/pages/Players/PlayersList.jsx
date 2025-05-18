import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';

function PlayersList() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .order('name');
          
        if (error) throw error;
        setPlayers(data);
      } catch (err) {
        console.error('Error fetching players:', err);
        setError('Failed to fetch players');
      } finally {
        setLoading(false);
      }
    }

    fetchPlayers();
  }, []);

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Players
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          component={RouterLink} 
          to="/players/new"
          startIcon={<AddIcon />}
        >
          New Player
        </Button>
      </Box>

      {players.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1">
              No players found. Add players to start tracking ratings!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>
                    <RouterLink 
                      to={`/players/${player.id}`} 
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <Typography color="primary" sx={{ fontWeight: 'bold' }}>
                        {player.name}
                      </Typography>
                    </RouterLink>
                  </TableCell>
                  <TableCell>{player.email || '-'}</TableCell>
                  <TableCell>
                    {new Date(player.created_at).toLocaleDateString()}
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

export default PlayersList; 