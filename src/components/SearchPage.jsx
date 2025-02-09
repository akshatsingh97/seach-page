import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from '../utils/utils.js';
import "./SearchPage.css";


const SearchPage = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const abortControllerRef = useRef(null);

    const fetchResults = useCallback(async (searchText) => {

        if(abortControllerRef.current){
            console.log("Aborting previous request");
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;


        setLoading(true);
        try{
            const response = await fetch(`https://jsonplaceholder.typicode.com/comments?q=${searchText}`, {signal});
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setResults(data.slice(0, 20));
        }catch(error){
            if(error.name === "AbortError"){
                console.log("Fetch request was aborted");
            }
            else{
                console.error("Error fetching data", error);
                setResults([]);
            }
        }finally {
            setLoading(false);
        }

        return () => abortControllerRef.current?.abort();
    }, []);

    const debounceSearch = useMemo(() => debounce(fetchResults, 600), [fetchResults]);

    useEffect(() => {
        if(query.length >= 3){
            debounceSearch(query);
        }
        else{
            setResults([]);
        }
    }, [query]);

    const handleSearchClick = () => {
        if (!loading) {
            fetchResults(query);
        }
    };

    const resultItems = useMemo(() =>
        results.map((item) => (
            <li key={item.id} className="result-item">
                <p><strong>Name:</strong> {item.name}</p>
                <p><strong>Email:</strong> {item.email}</p>
                <p><strong>Summary:</strong> {item.body.slice(0, 64)}...</p>
            </li>
        )),
    [results]);

    return(
        <div className="search-container">
        <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
        />
        <button className="search-button" onClick={() => handleSearchClick()} disabled={query.length < 3}>
            Search
        </button>
        {loading && <p className="loading-text">Loading...</p>}
        <ul className="results-list">{resultItems}</ul>
    </div>
    )

};

export default SearchPage;