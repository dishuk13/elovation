import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PlayersList from '../PlayersList';
import { supabase } from '../../../lib/supabase';

// Mock the supabase client response
const mockPlayers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2023-01-01T12:00:00Z' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2023-01-02T12:00:00Z' }
];

describe('PlayersList Component', () => {
  beforeEach(() => {
    // Reset mock and set up for each test
    jest.clearAllMocks();
    
    // Mock the Supabase response for players
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockPlayers,
          error: null
        })
      })
    });
  });

  test('renders loading state initially', () => {
    render(
      <BrowserRouter>
        <PlayersList />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders players list after loading', async () => {
    render(
      <BrowserRouter>
        <PlayersList />
      </BrowserRouter>
    );
    
    // Wait for the players to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Check if players are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  test('shows empty state when no players exist', async () => {
    // Override the mock for this specific test
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })
    });

    render(
      <BrowserRouter>
        <PlayersList />
      </BrowserRouter>
    );
    
    // Wait for the players to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Check if empty state message is displayed
    expect(screen.getByText('No players found. Add players to start tracking ratings!')).toBeInTheDocument();
  });

  test('displays error message when fetch fails', async () => {
    // Override the mock for this specific test
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to fetch players' }
        })
      })
    });

    render(
      <BrowserRouter>
        <PlayersList />
      </BrowserRouter>
    );
    
    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Check if error message is displayed
    expect(screen.getByText('Failed to fetch players')).toBeInTheDocument();
  });
}); 