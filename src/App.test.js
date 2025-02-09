import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

jest.mock('./components/SearchPage', () => () => <div data-testid="search-page-mock">Mock SearchPage</div>);

describe('App Component', () => {
  test('renders SearchPage component', () => {
    render(<App />);
    
    expect(screen.getByTestId('search-page-mock')).toBeInTheDocument();
  });
});