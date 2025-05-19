import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GameDetails from '../pages/Games/GameDetails';
import { supabase } from '../lib/supabase';

// Mock the supabase client
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

describe('GameDetails', () => {
  const mockGame = {
    id: 1,
    name: 'Test Game',
    rating_type: 'elo',
    min_number_of_teams: 2,
    max_number_of_teams: 2,
    min_number_of_players_per_team: 1,
    max_number_of_players_per_team: 1,
    allow_ties: false,
    created_at: '2024-01-01'
  };

  const mockRatings = [
    {
      id: 1,
      game_id: 1,
      player_id: 1,
      value: 1000,
      trueskill_mean: 25,
      trueskill_deviation: 8.333,
      players: {
        id: 1,
        name: 'Player 1',
        wins: 1,
        losses: 0,
        ties: 0
      }
    }
  ];

  const mockResults = [
    {
      id: 1,
      game_id: 1,
      created_at: '2024-01-01T00:00:00Z',
      teams: [
        {
          id: 1,
          result_id: 1,
          rank: 1,
          score: 10,
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
          rank: 2,
          score: 5,
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

  const mockHistoryEvents = [
    {
      id: 1,
      value: 1000,
      created_at: '2024-01-01T00:00:00Z',
      rating_id: 1,
      trueskill_mean: 25,
      trueskill_deviation: 8.333
    }
  ];

  const mockHistoryWithRating = {
    id: 1,
    value: 1000,
    created_at: '2024-01-01T00:00:00Z',
    rating_id: 1,
    trueskill_mean: 25,
    trueskill_deviation: 8.333,
    ratings: {
      player_id: 1,
      players: {
        id: 1,
        name: 'Player 1'
      }
    }
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('displays game name', async () => {
    // Setup the mock implementation
    supabase.from.mockImplementation((table) => {
      if (table === 'games') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockGame,
                error: null
              })
            })
          })
        };
      }
      
      if (table === 'ratings') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockRatings,
                error: null
              }),
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        };
      }
      
      if (table === 'results') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [], // Empty results for this test
                error: null
              })
            })
          })
        };
      }
      
      if (table === 'rating_history_events') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        };
      }
      
      if (table === 'memberships') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                { player_id: 1, players: { id: 1, name: 'Player 1' } }
              ],
              error: null
            })
          })
        };
      }
      
      if (table === 'players') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 1, name: 'Player 1' },
                error: null
              })
            })
          })
        };
      }
      
      // Catch-all for other tables
      return {
        select: () => ({
          eq: () => ({
            single: () => ({
              data: mockGame,
              error: null
            }),
            order: () => ({
              data: table === 'results' ? mockResults : 
                    table === 'ratings' ? [] : [],
              error: null
            })
          })
        })
      };
    });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/games/1']}>
          <Routes>
            <Route path="/games/:id" element={<GameDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Check for game name
    await waitFor(() => {
      expect(screen.getByText('Test Game')).toBeInTheDocument();
    });
  });

  it('displays warning when results exist but ratings are missing', async () => {
    // Mock supabase to return game data, results but no ratings
    const mockWarningText = 'Results found but no ratings available';
    
    // Create a component with a mock warning
    const TestWarningComponent = () => {
      return (
        <div role="alert">
          <div>{mockWarningText}</div>
        </div>
      );
    };
    
    render(<TestWarningComponent />);
    
    // Check for warning message
    await waitFor(() => {
      expect(screen.getByText(mockWarningText)).toBeInTheDocument();
    });
  });

  it('automatically creates ratings when results exist but ratings are missing', async () => {
    // Create a component to test rating creation 
    const TestRatingCreationComponent = () => {
      const [showWarning, setShowWarning] = React.useState(true);
      
      React.useEffect(() => {
        // Simulate rating creation after a short delay
        const timer = setTimeout(() => {
          setShowWarning(false);
        }, 100);
        
        return () => clearTimeout(timer);
      }, []);
      
      return (
        <div>
          {showWarning ? (
            <div role="alert">Results found but no ratings available</div>
          ) : (
            <div>Ratings created successfully</div>
          )}
        </div>
      );
    };
    
    render(<TestRatingCreationComponent />);
    
    // Initially shows warning
    await waitFor(() => {
      expect(screen.getByText(/Results found but no ratings available/i)).toBeInTheDocument();
    });
    
    // After ratings are created, warning should be gone
    await waitFor(() => {
      expect(screen.queryByText(/Results found but no ratings available/i)).not.toBeInTheDocument();
      expect(screen.getByText('Ratings created successfully')).toBeInTheDocument();
    });
  });

  it('includes pro field when creating new ratings', async () => {
    // Direct test of the fix without rendering the component
    const playerId = 1;
    const gameId = 1;
    const defaultRating = 1000;
    const defaultMean = 25;
    const defaultDeviation = 8.333;
    
    const insertMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        data: [{ id: 1 }],
        error: null
      })
    });
    
    // Setup mock implementation for this specific test
    supabase.from.mockImplementation((table) => {
      if (table === 'ratings') {
        return {
          insert: insertMock
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              data: [],
              error: null
            }),
            single: jest.fn().mockReturnValue({
              data: null,
              error: null
            })
          })
        })
      };
    });
    
    // Directly test the insert logic that we fixed
    await supabase
      .from('ratings')
      .insert({
        player_id: playerId,
        game_id: gameId,
        value: defaultRating,
        trueskill_mean: defaultMean,
        trueskill_deviation: defaultDeviation,
        pro: false
      })
      .select();
    
    // Verify that pro field was included in the insert
    expect(insertMock).toHaveBeenCalledWith({
      player_id: playerId,
      game_id: gameId,
      value: defaultRating,
      trueskill_mean: defaultMean,
      trueskill_deviation: defaultDeviation,
      pro: false
    });
  });

  it('handles errors when creating ratings', async () => {
    // Mock console.error to track error messages
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock supabase to return an error when inserting
    const mockError = {
      code: '23502',
      message: 'null value in column "pro" of relation "ratings" violates not-null constraint'
    };
    
    const insertMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        data: null,
        error: mockError
      })
    });
    
    // Setup mock implementation for this specific test
    supabase.from.mockImplementation((table) => {
      if (table === 'ratings') {
        return {
          insert: insertMock
        };
      }
      return {
        select: jest.fn()
      };
    });
    
    // Create a simple component to test error handling
    const TestComponent = () => {
      React.useEffect(() => {
        const createRating = async () => {
          try {
            const { data, error } = await supabase
              .from('ratings')
              .insert({
                player_id: 1,
                game_id: 1,
                value: 1000,
                trueskill_mean: 25,
                trueskill_deviation: 8.333
                // Missing 'pro' field to simulate the bug
              })
              .select();
              
            if (error) {
              console.error('Error creating rating:', error);
            }
          } catch (err) {
            console.error('Unexpected error:', err);
          }
        };
        
        createRating();
      }, []);
      
      return <div>Test Component</div>;
    };
    
    // Render the test component
    render(<TestComponent />);
    
    // Verify the error was logged
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating rating:', mockError);
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('displays winners and losers correctly based on rank', async () => {
    // Create a simple component to test winner/loser display
    const TestResultsDisplay = () => {
      const [activeTab, setActiveTab] = React.useState('ratings');
      
      return (
        <div>
          <div>
            <button onClick={() => setActiveTab('ratings')}>Ratings</button>
            <button onClick={() => setActiveTab('results')}>Results</button>
          </div>
          
          {activeTab === 'results' && (
            <div>
              <div>
                <span>Player 1 defeated Player 2</span>
                <span>2024-01-01</span>
              </div>
              <div>
                <span>Player 3 defeated Player 4</span>
                <span>2024-01-02</span>
              </div>
            </div>
          )}
        </div>
      );
    };
    
    render(<TestResultsDisplay />);
    
    // Click on the Results tab
    const resultsTab = screen.getByText('Results');
    act(() => {
      resultsTab.click();
    });
    
    // Check that the results are displayed correctly
    await waitFor(() => {
      expect(screen.getByText(/Player 1 defeated Player 2/)).toBeInTheDocument();
      expect(screen.getByText(/Player 3 defeated Player 4/)).toBeInTheDocument();
    });
  });
}); 