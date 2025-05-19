import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

// Import components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Import pages
import Dashboard from './pages/Dashboard';
import GamesList from './pages/Games/GamesList';
import GameDetails from './pages/Games/GameDetails';
import NewGame from './pages/Games/NewGame';
import PlayersList from './pages/Players/PlayersList';
import PlayerDetails from './pages/Players/PlayerDetails';
import NewPlayer from './pages/Players/NewPlayer';
import NewResult from './pages/Results/NewResult';
import Login from './pages/Auth/Login';
import AuthCallback from './pages/Auth/AuthCallback';

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/games" element={<GamesList />} />
            <Route path="/games/new" element={<NewGame />} />
            <Route path="/games/:id" element={<GameDetails />} />
            <Route path="/games/:id/results/new" element={<NewResult />} />
            <Route path="/players" element={<PlayersList />} />
            <Route path="/players/new" element={<NewPlayer />} />
            <Route path="/players/:id" element={<PlayerDetails />} />
          </Route>
        </Routes>
      </Container>
    </Box>
  );
}

export default App; 