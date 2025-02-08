import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchPage from './SearchPage';

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { id: 1, name: 'John Doe', email: 'john@example.com', body: 'Test comment body 1' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', body: 'Test comment body 2' }
    ])
  })
);

describe('SearchPage Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders search input and button', () => {
    render(<SearchPage />);
    expect(screen.getByPlaceholderText(/search.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  test('disables search button for less than 3 characters', () => {
    render(<SearchPage />);
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    fireEvent.change(screen.getByPlaceholderText(/search.../i), { target: { value: 'ab' } });
    expect(searchButton).toBeDisabled();
  });

  test('enables search button for 3 or more characters', () => {
    render(<SearchPage />);
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    fireEvent.change(screen.getByPlaceholderText(/search.../i), { target: { value: 'abc' } });
    expect(searchButton).not.toBeDisabled();
  });

  test('fetches and displays results on search button click', async () => {
    render(<SearchPage />);
    fireEvent.change(screen.getByPlaceholderText(/search.../i), { target: { value: 'john' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/comments?q=john');
    
    await waitFor(() => {
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
    });
  });

  test('displays loading text while fetching', async () => {
    render(<SearchPage />);
    fireEvent.change(screen.getByPlaceholderText(/search.../i), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    
    expect(screen.getByText(/loading.../i)).toBeInTheDocument();
    
    await waitFor(() => expect(screen.queryByText(/loading.../i)).not.toBeInTheDocument());
  });

  test('displays no results when API returns empty data', async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    
    render(<SearchPage />);
    fireEvent.change(screen.getByPlaceholderText(/search.../i), { target: { value: 'xyz' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    
    await waitFor(() => {
        expect(screen.queryAllByText(/name:/i)).toHaveLength(0);
    });
  });
});
