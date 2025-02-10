import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from '../utils/utils.js';
import "./SearchPage.css";


const SearchPage = () => {
    const [query, setQuery] = useState("");
    const [selectedQuery, setSelectedQuery] = useState("");
    const [results, setResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);

    const abortControllerRef = useRef(null);

    const fetchSuggestions = useCallback(async (searchText) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            const response = await fetch(`https://jsonplaceholder.typicode.com/comments?q=${searchText}`, { signal });
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setSuggestions(data.slice(0, 20).filter(item => item.name !== selectedQuery));
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Error fetching suggestions", error);
            }
        }
    }, [selectedQuery]);

    const fetchResults = useCallback(async () => {
        if (!selectedQuery) return;

        try {
            const response = await fetch(`https://jsonplaceholder.typicode.com/comments?q=${selectedQuery}`);
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setResults(data.slice(0, 20));
            setSuggestions([]);
        } catch (error) {
            console.error("Error fetching results", error);
            setResults([]);
        }
    }, [selectedQuery, suggestions]);

    const debounceFetchSuggestions = useMemo(() => debounce(fetchSuggestions, 400), [fetchSuggestions, selectedQuery]);


    useEffect(() => {
        if (query.length >= 3 && query !== selectedQuery) {
            debounceFetchSuggestions(query);
            setResults([]);
        } else {
            debounceFetchSuggestions.cancel();
            setSuggestions([]);
        }
        return () => debounceFetchSuggestions.cancel();
    }, [query, debounceFetchSuggestions, selectedQuery]);


    useEffect(() => {
        return () => {
            if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
                abortControllerRef.current.abort();
            }
            debounceFetchSuggestions.cancel();
        };
    }, []);

    const handleSuggestionClick = (suggestion) => {
        setQuery(suggestion.name);
        setSelectedQuery(suggestion.name);

        setSuggestions([]);
    };

    return(
        <div className="search-container">
            <input
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-input"
            />
            {suggestions.length > 0 && (
                <ul className="suggestions-list">
                    {suggestions.map((item) => (
                        <li key={item.id} onClick={() => handleSuggestionClick(item)}>
                            {item.name}
                        </li>
                    ))}
                </ul>
            )}
            <button className="search-button" onClick={fetchResults} disabled={!selectedQuery}>
                Search
            </button>
            <ul role="list" className="results-list">
                {results.map((item) => (
                    <li key={item.id} className="result-item" data-testid="result-item">
                        <p><strong>Name:</strong> {item.name}</p>
                        <p><strong>Email:</strong> {item.email}</p>
                        <p><strong>Summary:</strong> {item.body ? item.body.slice(0, 64) : "No summary available"}...</p>
                    </li>
                ))}
            </ul>
        </div>
    )

};

export default SearchPage;