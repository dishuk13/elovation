import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import App and all components referenced in the App's router
// This test will fail if any of these imports are invalid
import App from '../App';
import Dashboard from '../pages/Dashboard';
import GamesList from '../pages/Games/GamesList';
import GameDetails from '../pages/Games/GameDetails';
import NewGame from '../pages/Games/NewGame';
import PlayersList from '../pages/Players/PlayersList';
import NewPlayer from '../pages/Players/NewPlayer';
import NewResult from '../pages/Results/NewResult';

// This test specifically attempts to import PlayerDetails, which is missing
let PlayerDetails;
try {
  PlayerDetails = require('../pages/Players/PlayerDetails').default;
} catch (error) {
  // We'll check for this later in the test
}

describe('App Import Validation', () => {
  test('all components referenced in router can be imported', () => {
    // Test that all components can be imported
    expect(App).toBeDefined();
    expect(Dashboard).toBeDefined();
    expect(GamesList).toBeDefined();
    expect(GameDetails).toBeDefined();
    expect(NewGame).toBeDefined();
    expect(PlayersList).toBeDefined();
    expect(NewPlayer).toBeDefined();
    expect(NewResult).toBeDefined();
    
    // Check specifically for PlayerDetails which is missing
    // This should fail until the file is created
    expect(PlayerDetails).toBeDefined();
  });

  test('App component renders without crashing', () => {
    // This test will fail if any component referenced in the routes cannot be loaded
    expect(() => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      );
    }).not.toThrow();
  });

  // Test that all routes can be visited
  const routes = [
    '/',
    '/games',
    '/games/new',
    '/games/1',
    '/games/1/results/new',
    '/players',
    '/players/new',
    '/players/1',
  ];

  routes.forEach(route => {
    test(`route ${route} renders without crashing`, () => {
      expect(() => {
        render(
          <MemoryRouter initialEntries={[route]}>
            <App />
          </MemoryRouter>
        );
      }).not.toThrow();
    });
  });
}); 