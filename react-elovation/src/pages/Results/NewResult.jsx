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
      const validTeams = teams.filter(team => team.players.length > 0);
      validTeams.forEach((team, teamIndex) => {
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
      
      // Update player ratings based on this result
      await updateRatings(resultData.id);
      
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

  // Update player ratings based on the newly recorded result
  const updateRatings = async (resultId) => {
    try {
      // Fetch the complete result with teams and players
      const { data: result, error: resultError } = await supabase
        .from('results')
        .select(`
          id,
          created_at,
          teams (
            id,
            rank,
            score,
            players:memberships (
              player_id,
              players (
                id,
                name
              )
            )
          )
        `)
        .eq('id', resultId)
        .single();
      
      if (resultError) throw resultError;
      
      // Format teams data
      result.teams.forEach(team => {
        team.players = team.players.map(p => ({
          id: p.player_id,
          name: p.players.name
        }));
      });
      
      // Fetch current player ratings
      const playerIds = result.teams
        .flatMap(team => team.players)
        .map(player => player.id);
      
      const { data: ratings, error: ratingsError } = await supabase
        .from('ratings')
        .select('*')
        .in('player_id', playerIds)
        .eq('game_id', gameId);
      
      if (ratingsError) throw ratingsError;
      
      // Create a map of player ID to rating
      const playerRatings = {};
      ratings.forEach(rating => {
        playerRatings[rating.player_id] = rating;
      });
      
      // Create default ratings for players who don't have one yet
      for (const playerId of playerIds) {
        if (!playerRatings[playerId]) {
          // Create a default rating for this player
          const { data: newRating, error: createError } = await supabase
            .from('ratings')
            .insert({
              player_id: playerId,
              game_id: parseInt(gameId),
              value: 1000, // Default rating
              trueskill_mean: 25,
              trueskill_deviation: 8.333,
              pro: false
            })
            .select();
            
          if (createError) throw createError;
          playerRatings[playerId] = newRating[0];
        }
      }
      
      // Calculate and update ratings based on the game type
      if (game.rating_type === 'elo') {
        // Process ELO rating update (1v1 games)
        await updateEloRatings(result, playerRatings);
      } else if (game.rating_type === 'trueskill') {
        // Process TrueSkill rating update (team games)
        await updateTrueSkillRatings(result, playerRatings);
      }
      
    } catch (err) {
      console.error('Error updating ratings:', err);
      // Don't throw, just log error - we still want the result to be saved
    }
  };

  // Update ELO ratings for 1v1 games
  const updateEloRatings = async (result, playerRatings) => {
    try {
      const teams = result.teams.sort((a, b) => a.rank - b.rank);
      
      // Validate we have a proper 1v1 game
      if (teams.length !== 2 || teams[0].players.length !== 1 || teams[1].players.length !== 1) {
        console.warn('ELO rating is only supported for 1v1 games');
        return;
      }
      
      const winnerId = teams[0].players[0].id;
      const loserId = teams[1].players[0].id;
      const isTie = teams[0].rank === teams[1].rank;
      
      // Get current ratings
      const winnerRating = playerRatings[winnerId];
      const loserRating = playerRatings[loserId];
      
      if (!winnerRating || !loserRating) {
        console.error('Missing player ratings');
        return;
      }
      
      // Calculate new ELO ratings
      const kFactor = 32;
      const expectedWinner = 1.0 / (1.0 + Math.pow(10, (loserRating.value - winnerRating.value) / 400.0));
      const expectedLoser = 1.0 / (1.0 + Math.pow(10, (winnerRating.value - loserRating.value) / 400.0));
      
      let newWinnerRating, newLoserRating;
      
      if (isTie) {
        // If it's a tie, both players get 0.5
        newWinnerRating = Math.round(winnerRating.value + kFactor * (0.5 - expectedWinner));
        newLoserRating = Math.round(loserRating.value + kFactor * (0.5 - expectedLoser));
      } else {
        // Otherwise winner gets 1.0, loser gets 0.0
        newWinnerRating = Math.round(winnerRating.value + kFactor * (1.0 - expectedWinner));
        newLoserRating = Math.round(loserRating.value + kFactor * (0.0 - expectedLoser));
      }
      
      // Update winner's rating
      await supabase
        .from('ratings')
        .update({ value: newWinnerRating })
        .eq('id', winnerRating.id);
      
      // Create winner's history event
      await supabase
        .from('rating_history_events')
        .insert({
          rating_id: winnerRating.id,
          value: newWinnerRating,
          created_at: result.created_at
        });
      
      // Update loser's rating
      await supabase
        .from('ratings')
        .update({ value: newLoserRating })
        .eq('id', loserRating.id);
      
      // Create loser's history event
      await supabase
        .from('rating_history_events')
        .insert({
          rating_id: loserRating.id,
          value: newLoserRating,
          created_at: result.created_at
        });
      
    } catch (err) {
      console.error('Error updating ELO ratings:', err);
    }
  };

  // Update TrueSkill ratings for team games
  const updateTrueSkillRatings = async (result, playerRatings) => {
    try {
      // Implementation similar to the one in GameDetails component
      // This is a simplified version focused on updating the ratings
      const teams = result.teams.sort((a, b) => a.rank - b.rank);
      
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
      
      // Process teams in pairs
      for (let i = 0; i < teamRatings.length - 1; i++) {
        const team1 = teamRatings[i];
        const team2 = teamRatings[i + 1];
        
        // Calculate skill difference
        const skillDiff = team1.mean - team2.mean;
        const beta = 4.166;
        
        // Calculate total variance
        const totalVariance = team1.variance + team2.variance + 2 * Math.pow(beta, 2);
        
        // Determine if it's a tie
        const isTie = team1.rank === team2.rank;
        const margin = isTie ? 0 : 1;
        
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
            
            // Update the player's rating
            await supabase
              .from('ratings')
              .update({
                value: newPlayerValue,
                trueskill_mean: newPlayerMean,
                trueskill_deviation: newPlayerDeviation
              })
              .eq('id', playerRating.id);
            
            // Create rating history event
            await supabase
              .from('rating_history_events')
              .insert({
                rating_id: playerRating.id,
                value: newPlayerValue,
                trueskill_mean: newPlayerMean,
                trueskill_deviation: newPlayerDeviation,
                created_at: result.created_at
              });
          }
        }
      }
    } catch (err) {
      console.error('Error updating TrueSkill ratings:', err);
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