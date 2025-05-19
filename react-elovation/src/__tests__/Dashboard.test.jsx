import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { supabase } from '../lib/supabase';

// Mock the supabase client
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

// Mock the schema access check from Dashboard
jest.mock('../lib/checkSchemaAccess', () => ({
  checkSchemaAccess: jest.fn(() => Promise.resolve('OK'))
}));

describe('Dashboard', () => {
  const mockGames = [
    {
      id: 1,
      name: 'Test Game',
      rating_type: 'elo',
      updated_at: '2024-01-01'
    }
  ];

  const mockResultsWithRanks = [
    {
      id: 1,
      game_id: 1,
      created_at: '2023-12-28T00:00:00Z',
      games: {
        name: 'Test Game'
      },
      teams: [
        {
          id: 1,
          result_id: 1,
          rank: 1, // Winner
          players: [
            {
              id: 1,
              name: 'Player 1'
            }
          ]
        },
        {
          id: 2,
          result_id: 1,
          rank: 2, // Loser
          players: [
            {
              id: 2,
              name: 'Player 2'
            }
          ]
        }
      ]
    }
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('displays winners and losers correctly in recent results', async () => {
    // Setup the mock implementation for this specific test
    supabase.from.mockImplementation((table) => {
      if (table === 'games') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockGames,
              error: null
            })
          })
        };
      } 
      
      if (table === 'results') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 1, 
                  created_at: '2023-12-28T00:00:00Z',
                  game_id: 1,
                  games: { name: 'Test Game' }
                }
              ],
              error: null
            })
          })
        };
      }
      
      if (table === 'teams') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                { id: 1, rank: 1, score: 10 },
                { id: 2, rank: 2, score: 5 }
              ],
              error: null
            })
          })
        };
      }
      
      if (table === 'memberships') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation((field, value) => {
              // Return different players based on the team_id
              if (value === 1) {
                return Promise.resolve({
                  data: [{ player_id: 1, players: { id: 1, name: 'Player 1' } }],
                  error: null
                });
              } else {
                return Promise.resolve({
                  data: [{ player_id: 2, players: { id: 2, name: 'Player 2' } }],
                  error: null
                });
              }
            })
          })
        };
      }
      
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      };
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
    });

    // Wait for the component to load data and render
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Check if the results display correctly shows Player 1 as the winner over Player 2
    await waitFor(() => {
      expect(screen.getByText(/Player 1 defeated Player 2/)).toBeInTheDocument();
      expect(screen.getByText(/Test Game - 12\/27\/2023/)).toBeInTheDocument();
    });
  });
}); 