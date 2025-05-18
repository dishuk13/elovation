import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import Box from '@mui/material/Box';

function Navbar() {
  return (
    <AppBar position="static">
      <Toolbar>
        <SportsEsportsIcon sx={{ mr: 1 }} />
        <Typography variant="h6" component={RouterLink} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
          Elovation
        </Typography>
        <Box>
          <Button color="inherit" component={RouterLink} to="/games">
            Games
          </Button>
          <Button color="inherit" component={RouterLink} to="/players">
            Players
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar; 