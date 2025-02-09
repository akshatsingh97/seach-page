import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchPage from './SearchPage';

// Mock AbortController
global.AbortController = jest.fn(() => ({
    abort: jest.fn(),
    signal: {}
}));

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

    await act(async () => {
        fireEvent.change(screen.getByPlaceholderText(/search.../i), { target: { value: 'john' } });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));
    });

    expect(fetch).toHaveBeenCalledWith(
        'https://jsonplaceholder.typicode.com/comments?q=john',
        { signal: expect.any(Object) }
    );
    
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

  test('handles fetch abort scenario', async () => {
    global.fetch.mockImplementationOnce(() =>
      new Promise((_, reject) => setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 100))
    );

    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    render(<SearchPage />);
    
    fireEvent.change(screen.getByPlaceholderText(/search.../i), { target: { value: 'john' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith('Fetch request was aborted');
    });

    consoleLogSpy.mockRestore();
  });

  test('handles fetch failure and clears results', async () => {
    global.fetch.mockImplementationOnce(() => Promise.reject(new Error('Network Error')));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<SearchPage />);

    fireEvent.change(screen.getByPlaceholderText(/search.../i), { target: { value: 'error' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching data', expect.any(Error));
        expect(screen.queryAllByText(/name:/i)).toHaveLength(0);
    });

    consoleErrorSpy.mockRestore();
  });

  test('aborts previous fetch request when a new search query is entered', async () => {
    jest.useFakeTimers();

    const abortSpy = jest.fn();
    const mockAbortController = jest.fn(() => ({
        abort: abortSpy,
        signal: {}
    }));

    global.AbortController = mockAbortController;

    global.fetch.mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve([
              { id: 1, name: 'John Doe', email: 'john@example.com', body: 'Test comment body 1' }
          ])
      }), 300))
    );

    render(<SearchPage />);

    fireEvent.change(screen.getByPlaceholderText(/search.../i), { target: { value: 'abc' } });

    jest.runAllTimers();

    fireEvent.change(screen.getByPlaceholderText(/search.../i), { target: { value: 'def' } });

    jest.runAllTimers();

    await waitFor(() => {
        expect(abortSpy).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  test('handles API failure when response is not ok', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
            ok: false,
            json: () => Promise.resolve({})
        })
    );

    render(<SearchPage />);

    fireEvent.change(screen.getByPlaceholderText(/search.../i), { target: { value: 'error' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching data", expect.any(Error));

        expect(screen.queryAllByText(/name:/i)).toHaveLength(0);
    });

    consoleErrorSpy.mockRestore();
  });

  test('calls fetchResults when search button is clicked and loading is false', async () => {
    const fetchResultsSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
                { id: 1, name: 'John Doe', email: 'john@example.com', body: 'Test comment body 1' }
            ])
        })
    );

    render(<SearchPage />);

    fireEvent.change(screen.getByPlaceholderText(/search.../i), { target: { value: 'test' } });

    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
        expect(fetchResultsSpy).toHaveBeenCalled();
    });

    fetchResultsSpy.mockRestore();
  });

  test('does not call fetchResults when loading is true', async () => {
    global.fetch = jest.fn(() =>
        new Promise((resolve) =>
            setTimeout(() => resolve({
                ok: true,
                json: () => Promise.resolve([])
            }), 500)
        )
    );

    render(<SearchPage />);

    // Enter a valid search query
    fireEvent.change(screen.getByPlaceholderText(/search.../i), { target: { value: 'loadingtest' } });

    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

});
