import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DestinationSearch from '../src/components/DestinationSearch.jsx';

describe('TAMS-24: Destination Search Interface Validation', () => {

  it('renders search input with required placeholder "Search by destination..."', () => {
    const html = renderToStaticMarkup(React.createElement(DestinationSearch));
    expect(html).toContain('placeholder="Search by destination..."');
    expect(html).toContain('id="destination-search-input"');
    expect(html).toContain('type="text"');
  });

  it('includes accessible screen reader label', () => {
    const html = renderToStaticMarkup(React.createElement(DestinationSearch));
    expect(html).toContain('class="visually-hidden"');
    expect(html).toContain('Search by destination');
    expect(html).toContain('for="destination-search-input"');
  });

  it('includes search icon inside input container', () => {
    const html = renderToStaticMarkup(React.createElement(DestinationSearch));
    expect(html).toContain('class="search-icon"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('<svg');
  });

  it('does NOT render clear button when input value is empty', () => {
    const html = renderToStaticMarkup(React.createElement(DestinationSearch, { value: '' }));
    expect(html).not.toContain('search-clear-btn');
  });

  it('renders accessible clear button when text is present', () => {
    const html = renderToStaticMarkup(React.createElement(DestinationSearch, { value: 'Goa' }));
    expect(html).toContain('class="search-clear-btn"');
    expect(html).toContain('aria-label="Clear destination search"');
    expect(html).toContain('type="button"');
  });

  it('renders container with search landmark role for accessibility', () => {
    const html = renderToStaticMarkup(React.createElement(DestinationSearch));
    expect(html).toContain('role="search"');
  });

});
