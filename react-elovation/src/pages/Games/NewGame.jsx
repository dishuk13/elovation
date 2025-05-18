import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Typography, 
  Box, 
  TextField, 
  FormControl, 
  FormLabel, 
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  Button, 
  Grid,
  Paper,
  Switch,
  Alert,
  Snackbar
} from '@mui/material';

function NewGame() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    rating_type: 'trueskill',
    min_number_of_teams: 2,
    max_number_of_teams: 2,
    min_number_of_players_per_team: 1,
    max_number_of_players_per_team: 1,
    allow_ties: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleRatingTypeChange = (e) => {
    const ratingType = e.target.value;
    
    // When switching to Elo, set team and player constraints appropriate for 1v1
    if (ratingType === 'elo') {
      setFormData({
        ...formData,
        rating_type: ratingType,
        min_number_of_teams: 2,
        max_number_of_teams: 2,
        min_number_of_players_per_team: 1,
        max_number_of_players_per_team: 1
      });
    } else {
      setFormData({
        ...formData,
        rating_type: ratingType
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate input
      if (!formData.name.trim()) {
        throw new Error('Game name is required');
      }
      
      if (parseInt(formData.min_number_of_teams) < 2) {
        throw new Error('Minimum number of teams must be at least 2');
      }
      
      if (
        formData.max_number_of_teams && 
        parseInt(formData.min_number_of_teams) > parseInt(formData.max_number_of_teams)
      ) {
        throw new Error('Maximum number of teams cannot be less than minimum');
      }
      
      if (parseInt(formData.min_number_of_players_per_team) < 1) {
        throw new Error('Minimum number of players per team must be at least 1');
      }
      
      if (
        formData.max_number_of_players_per_team && 
        parseInt(formData.min_number_of_players_per_team) > parseInt(formData.max_number_of_players_per_team)
      ) {
        throw new Error('Maximum number of players per team cannot be less than minimum');
      }

      // Prepare data for insertion
      const gameData = {
        ...formData,
        min_number_of_teams: parseInt(formData.min_number_of_teams),
        max_number_of_teams: formData.max_number_of_teams ? parseInt(formData.max_number_of_teams) : null,
        min_number_of_players_per_team: parseInt(formData.min_number_of_players_per_team),
        max_number_of_players_per_team: formData.max_number_of_players_per_team ? 
          parseInt(formData.max_number_of_players_per_team) : null
      };

      // Insert the game into Supabase
      const { data, error } = await supabase
        .from('games')
        .insert(gameData)
        .select()
        .single();

      if (error) throw error;

      setSuccessMessage('Game created successfully!');
      setTimeout(() => {
        navigate(`/games/${data.id}`);
      }, 1500);
    } catch (err) {
      console.error('Error creating game:', err);
      setError(err.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Create New Game
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                id="name"
                name="name"
                label="Game Name"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Rating System</FormLabel>
                <RadioGroup
                  name="rating_type"
                  value={formData.rating_type}
                  onChange={handleRatingTypeChange}
                  row
                >
                  <FormControlLabel 
                    value="trueskill" 
                    control={<Radio disabled={loading} />} 
                    label="TrueSkill (supports teams)" 
                  />
                  <FormControlLabel 
                    value="elo" 
                    control={<Radio disabled={loading} />} 
                    label="Elo (1v1 only)" 
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {formData.rating_type === 'trueskill' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    type="number"
                    id="min_number_of_teams"
                    name="min_number_of_teams"
                    label="Minimum Number of Teams"
                    inputProps={{ min: 2 }}
                    value={formData.min_number_of_teams}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    id="max_number_of_teams"
                    name="max_number_of_teams"
                    label="Maximum Number of Teams (optional)"
                    inputProps={{ min: formData.min_number_of_teams }}
                    value={formData.max_number_of_teams}
                    onChange={handleChange}
                    disabled={loading}
                    helperText="Leave empty for unlimited"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    type="number"
                    id="min_number_of_players_per_team"
                    name="min_number_of_players_per_team"
                    label="Minimum Players Per Team"
                    inputProps={{ min: 1 }}
                    value={formData.min_number_of_players_per_team}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    id="max_number_of_players_per_team"
                    name="max_number_of_players_per_team"
                    label="Maximum Players Per Team (optional)"
                    inputProps={{ min: formData.min_number_of_players_per_team }}
                    value={formData.max_number_of_players_per_team}
                    onChange={handleChange}
                    disabled={loading}
                    helperText="Leave empty for unlimited"
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allow_ties}
                    onChange={handleChange}
                    name="allow_ties"
                    color="primary"
                    disabled={loading}
                  />
                }
                label="Allow Ties"
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => navigate('/games')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Game'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
      
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
        message={successMessage}
      />
    </Box>
  );
}

export default NewGame;