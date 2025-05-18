import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../Navbar';

describe('Navbar Component', () => {
  test('renders the application name', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    
    // Check if the app name is in the document
    expect(screen.getByText('Elovation')).toBeInTheDocument();
  });
  
  test('renders navigation links', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    
    // Check if main navigation links are present
    expect(screen.getByText('Games')).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();
  });
}); 