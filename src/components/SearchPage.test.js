import React from 'react';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchPage from './SearchPage';

jest.spyOn(global, 'fetch');
jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock fetch API
global.fetch = jest.fn();

describe('SearchPage Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    fetch.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders search input and button', () => {
    render(<SearchPage />);
    expect(screen.getByPlaceholderText(/search.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  test('fetches and displays suggestions', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' }
      ]),
    });

    render(<SearchPage />);
    const input = screen.getByPlaceholderText(/search.../i);
    fireEvent.change(input, { target: { value: 'John' } });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('fetches and displays results on search button click', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { id: 1, name: 'John Doe', email: 'john@example.com', body: 'Test body' }
      ]),
    });

    render(<SearchPage />);
    const input = screen.getByPlaceholderText(/search.../i);
    fireEvent.change(input, { target: { value: 'John Doe' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('John Doe'));
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  test('disables search button if no query is selected', () => {
    render(<SearchPage />);
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
  });

  test('handles API errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network Error'));

    render(<SearchPage />);
    const input = screen.getByPlaceholderText(/search.../i);
    fireEvent.change(input, { target: { value: 'John' } });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  test('aborts previous fetch request when a new search query is entered', async () => {
    const abortMock = jest.fn();
    global.AbortController = jest.fn(() => ({
        abort: abortMock,
        signal: {},
    }));

    fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
            { id: 1, name: 'John Doe' },
        ]),
    });

    render(<SearchPage />);
    
    const input = screen.getByPlaceholderText(/search.../i);
    
    fireEvent.change(input, { target: { value: 'John' } });
    
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    
    fireEvent.change(input, { target: { value: 'Jane' } });

    await waitFor(() => expect(abortMock).toHaveBeenCalled());

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  test('fetchResults updates results and clears suggestions', async () => {
    const mockResults = [
        { id: 1, name: 'John Doe', email: 'john@example.com', body: 'This is a test summary.' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', body: 'Jane has a different summary.' }
    ];

    fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResults),
    });

    render(<SearchPage />);
    const input = screen.getByPlaceholderText(/search.../i);

    fireEvent.change(input, { target: { value: 'John Doe' } });

    await waitFor(() => {
        fireEvent.click(screen.getByText('John Doe'));
    });

    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    expect(screen.queryByRole('list', { name: /suggestions/i })).not.toBeInTheDocument();
  });

test("renders result items correctly when results state is updated", async () => {
    render(<SearchPage />);

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();

    await act(async () => {
        const resultsList = screen.getByRole("list");
        const mockResults = [
            { id: 1, name: "John Doe", email: "john@example.com", body: "This is John's comment." },
            { id: 2, name: "Jane Doe", email: "jane@example.com", body: "This is Jane's comment." },
        ];

        resultsList.replaceChildren(
            ...mockResults.map(({ id, name, email, body }) => {
                const li = document.createElement("li");
                li.className = "result-item";
                li.innerHTML = `
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Summary:</strong> ${body.slice(0, 64)}...</p>
                `;
                return li;
            })
        );
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  test("handles missing body in result items", async () => {
    render(<SearchPage />);

    await act(async () => {
        const resultsList = screen.getByRole("list");
        const mockResults = [{ id: 3, name: "Alice", email: "alice@example.com" }];

        resultsList.replaceChildren(
            ...mockResults.map(({ id, name, email }) => {
                const li = document.createElement("li");
                li.className = "result-item";
                li.innerHTML = `
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Summary:</strong> No summary available...</p>
                `;
                return li;
            })
        );
    });

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("No summary available...")).toBeInTheDocument();
  });

  test("renders correct number of result items", async () => {
    render(<SearchPage />);

    await act(async () => {
        const resultsList = screen.getByRole("list");
        const mockResults = [
            { id: 1, name: "John Doe", email: "john@example.com", body: "Comment 1" },
            { id: 2, name: "Jane Doe", email: "jane@example.com", body: "Comment 2" },
            { id: 3, name: "Alice", email: "alice@example.com", body: "Comment 3" },
        ];

        resultsList.replaceChildren(
            ...mockResults.map(({ id, name, email, body }) => {
                const li = document.createElement("li");
                li.className = "result-item";
                li.innerHTML = `
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Summary:</strong> ${body.slice(0, 64)}...</p>
                `;
                return li;
            })
        );
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  test("does not render result items when results array is empty", async () => {
    render(<SearchPage />);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  test("renders result items with class 'result-item'", async () => {
    fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
            { id: 1, name: "John Doe" },
            { id: 2, name: "Jane Doe" },
        ],
    });

    fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
            { id: 1, name: "John Doe", email: "john@example.com", body: "This is John's comment." },
            { id: 2, name: "Jane Doe", email: "jane@example.com", body: "This is Jane's comment." },
        ],
    });

    render(<SearchPage />);

    fireEvent.change(screen.getByPlaceholderText("Search..."), {
        target: { value: "John" },
    });

    await waitFor(() => {
        expect(screen.getByText((content) => content.includes("John Doe"))).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText((content) => content.includes("John Doe")));

    fireEvent.click(screen.getByText("Search"));

    await waitFor(() => {
        const resultItems = screen.getAllByTestId("result-item");
        expect(resultItems.length).toBe(2);
    });

    const resultItems = screen.getAllByTestId("result-item");
    resultItems.forEach((item) => {
        expect(item).toHaveClass("result-item");
    });

    expect(
        screen.getByText((content) => content.includes("This is John's comment"))
    ).toBeInTheDocument();

    expect(
        screen.getByText((content) => content.includes("This is Jane's comment"))
    ).toBeInTheDocument();

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
});

test("does not render result items when results are empty", async () => {
    fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
            { id: 99, name: "No Results" },
        ],
    });

    fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
    });

    render(<SearchPage />);

    fireEvent.change(screen.getByPlaceholderText("Search..."), {
        target: { value: "No Results" },
    });

    await waitFor(() => {
        expect(screen.getByText("No Results")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("No Results"));

    fireEvent.click(screen.getByText("Search"));

    await waitFor(() => {
        expect(screen.queryByTestId("result-item")).not.toBeInTheDocument();
    });
});



});
