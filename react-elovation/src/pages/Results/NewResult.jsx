import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Typography, 
  Box, 
  Button, 
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
  Alert,
  Snackbar,
  Divider
} from '@mui/material';

function NewResult() {
  const { id: gameId } = useParams();
  const navigate = useNavigate();
  
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [teams, setTeams] = useState([
    { rank: 1, players: [], score: null },
    { rank: 2, players: [], score: null }
  ]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch game details
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();
          
        if (gameError) throw gameError;
        setGame(gameData);

        // Fetch players
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .order('name');
          
        if (playersError) throw playersError;
        setPlayers(playersData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [gameId]);

  const handleTeamPlayersChange = (teamIndex, newPlayers) => {
    const newTeams = [...teams];
    newTeams[teamIndex].players = newPlayers;
    setTeams(newTeams);
  };

  const handleTeamScoreChange = (teamIndex, score) => {
    const newTeams = [...teams];
    newTeams[teamIndex].score = score === '' ? null : Number(score);
    setTeams(newTeams);
  };

  const handleTeamRankChange = (teamIndex, rank) => {
    const newTeams = [...teams];
    newTeams[teamIndex].rank = rank === '' ? null : Number(rank);
    setTeams(newTeams);
  };

  const addTeam = () => {
    setTeams([...teams, { rank: teams.length + 1, players: [], score: null }]);
  };

  const removeTeam = (index) => {
    if (teams.length <= 2) return; // Maintain at least 2 teams
    const newTeams = teams.filter((_, i) => i !== index);
    setTeams(newTeams);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join('. '));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create result
      const { data: resultData, error: resultError } = await supabase
        .from('results')
        .insert([{ game_id: gameId }])
        .select()
        .single();
        
      if (resultError) throw resultError;
      
      // Create teams
      const teamsToInsert = teams
        .filter(team => team.players.length > 0)
        .map(team => ({
          result_id: resultData.id,
          rank: team.rank,
          score: team.score
        }));
        
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .insert(teamsToInsert)
        .select();
        
      if (teamsError) throw teamsError;
      
      // Create player_teams connections
      const playerTeamsToInsert = [];
      teams.forEach((team, teamIndex) => {
        team.players.forEach(player => {
          playerTeamsToInsert.push({
            player_id: player.id,
            team_id: teamsData[teamIndex].id
          });
        });
      });
      
      const { error: playerTeamsError } = await supabase
        .from('memberships')
        .insert(playerTeamsToInsert);
        
      if (playerTeamsError) throw playerTeamsError;
      
      setSuccess(true);
      setTimeout(() => {
        navigate(`/games/${gameId}`);
      }, 1500);
    } catch (err) {
      console.error('Error recording result:', err);
      setError('Failed to record result. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const validateForm = () => {
    const errors = [];
    
    // Check if we have at least 2 teams with players
    const validTeams = teams.filter(team => team.players.length > 0);
    if (validTeams.length < 2) {
      errors.push('At least 2 teams with players are required');
    }
    
    // Check min/max teams
    if (game.min_number_of_teams && validTeams.length < game.min_number_of_teams) {
      errors.push(`At least ${game.min_number_of_teams} teams are required`);
    }
    
    if (game.max_number_of_teams && validTeams.length > game.max_number_of_teams) {
      errors.push(`Maximum ${game.max_number_of_teams} teams are allowed`);
    }
    
    // Check min/max players per team
    teams.forEach((team, index) => {
      if (team.players.length > 0) {
        if (game.min_number_of_players_per_team && team.players.length < game.min_number_of_players_per_team) {
          errors.push(`Team ${index + 1} needs at least ${game.min_number_of_players_per_team} players`);
        }
        
        if (game.max_number_of_players_per_team && team.players.length > game.max_number_of_players_per_team) {
          errors.push(`Team ${index + 1} can have at most ${game.max_number_of_players_per_team} players`);
        }
      }
    });
    
    // Check for ties
    if (!game.allow_ties) {
      const ranks = validTeams.map(team => team.rank);
      if (new Set(ranks).size !== ranks.length) {
        errors.push('Ties are not allowed in this game');
      }
    }
    
    // Check that a player is not in multiple teams
    const playerCounts = {};
    teams.forEach(team => {
      team.players.forEach(player => {
        playerCounts[player.id] = (playerCounts[player.id] || 0) + 1;
      });
    });
    
    const duplicatePlayers = Object.entries(playerCounts)
      .filter(([_, count]) => count > 1)
      .map(([playerId]) => players.find(p => p.id === Number(playerId))?.name);
      
    if (duplicatePlayers.length > 0) {
      errors.push(`Player${duplicatePlayers.length > 1 ? 's' : ''} ${duplicatePlayers.join(', ')} cannot be in multiple teams`);
    }
    
    return errors;
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (!game) return <Alert severity="error">Game not found</Alert>;

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Record Result: {game.name}
      </Typography>

      <Paper sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ mb: 2 }}>Teams</Typography>

          <Grid container spacing={3}>
            {teams.map((team, index) => (
              <Grid item xs={12} key={index}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Rank</InputLabel>
                        <Select
                          value={team.rank}
                          label="Rank"
                          onChange={(e) => handleTeamRankChange(index, e.target.value)}
                        >
                          {Array.from({ length: teams.length }, (_, i) => (
                            <MenuItem key={i + 1} value={i + 1}>
                              {i + 1}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Score (optional)"
                        type="number"
                        value={team.score === null ? '' : team.score}
                        onChange={(e) => handleTeamScoreChange(index, e.target.value)}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Autocomplete
                        multiple
                        options={players}
                        getOptionLabel={(option) => option.name}
                        value={team.players}
                        onChange={(_, newValue) => handleTeamPlayersChange(index, newValue)}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              label={option.name}
                              {...getTagProps({ index })}
                              key={option.id}
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Players"
                            placeholder="Add players"
                          />
                        )}
                      />
                    </Grid>
                    {teams.length > 2 && (
                      <Grid item xs={12}>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => removeTeam(index)}
                        >
                          Remove Team
                        </Button>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>
            ))}

            <Grid item xs={12}>
              <Button 
                variant="outlined" 
                onClick={addTeam}
                disabled={game.max_number_of_teams && teams.length >= game.max_number_of_teams}
              >
                Add Team
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate(`/games/${gameId}`)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                  disabled={submitting}
                >
                  {submitting ? 'Recording...' : 'Record Result'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Snackbar
        open={success}
        autoHideDuration={2000}
        onClose={() => setSuccess(false)}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Result recorded successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default NewResult; 