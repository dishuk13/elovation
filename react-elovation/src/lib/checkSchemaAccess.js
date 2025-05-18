import { supabase } from './supabase';

// Utility function to check if tables and views exist and are accessible
export async function checkSchemaAccess() {
  try {
    console.log("Checking schema access...");
    
    // Check players table
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('id')
      .limit(1);
    
    console.log("Players table:", playersError ? "ERROR" : "OK", playersError || '');
    
    // Check teams table
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id')
      .limit(1);
    
    console.log("Teams table:", teamsError ? "ERROR" : "OK", teamsError || '');
    
    // Check memberships table
    const { data: membershipsData, error: membershipsError } = await supabase
      .from('memberships')
      .select('id')
      .limit(1);
    
    console.log("Memberships table:", membershipsError ? "ERROR" : "OK", membershipsError || '');
    
    // Check team_players view
    const { data: teamPlayersData, error: teamPlayersError } = await supabase
      .from('team_players')
      .select('team_id')
      .limit(1);
    
    console.log("Team_players view:", teamPlayersError ? "ERROR" : "OK", teamPlayersError || '');
    
    // Test the query that's failing
    if (teamsData && teamsData.length > 0) {
      const teamId = teamsData[0].id;
      const { data: testData, error: testError } = await supabase
        .from('team_players')
        .select('player_id, player_name')
        .eq('team_id', teamId);
      
      console.log("Test query:", testError ? "ERROR" : "OK", testError || '');
    }
    
    return "Schema check complete. Check console for results.";
  } catch (error) {
    console.error("Schema check error:", error);
    return "Schema check failed. See console for details.";
  }
} 