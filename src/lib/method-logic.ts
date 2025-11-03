/**
 * Method Logic - Video Search Pattern Data Manager
 *
 * REFACTORED RESPONSIBILITIES:
 * This module is now ONLY responsible for reading and writing search term objects
 * to/from the JSON file. All parsing, filtering, and formatting logic has been
 * moved to search-settings.ts.
 *
 * FUNCTIONS:
 *  - loadAllSearchTerms(): Load all search term objects from JSON as a unified list
 *  - saveSearchTerm(): Save a new search term object to the JSON file
 *  - updateSearchTerm(): Update an existing search term in the JSON file
 *  - deleteSearchTerm(): Remove a search term from the JSON file
 *
 * Each search term object contains:
 *  - name: string
 *  - specifier: string (template like "YYYY MM DD", "XXXX", etc.)
 *  - genre: string
 *  - age: 'new' | 'old' | ''
 *  - constraints: Constraint[]
 */

import searchTermsData from './search-terms.json' with { type: "json" };

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Constraint {
  type: 'year' | 'date-before' | 'date-after' | 'range' | 'time-range' | 'letter-range' | 'filter' | 'category';
  value: string | number;
}

interface SearchPattern {
  name: string;
  specifiers: string[];  // Array of specifier templates like ["YYYY MM DD", "XXXX", ""]
  genre: string;
  age: 'new' | 'old' | '';
  constraints: Constraint[];
}

interface SearchTermsData {
  patterns: SearchPattern[];
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type { SearchPattern, Constraint };

// ============================================================================
// PUBLIC API: DATA LOADING
// ============================================================================

/**
 * Load all search term objects from JSON as a unified list
 * Returns all patterns from the 'patterns' array
 *
 * This will be called by +page.svelte to populate allSearchTerms
 */
export function loadAllSearchTerms(): SearchPattern[] {
  const data = searchTermsData as SearchTermsData;
  console.log('Loaded', data.patterns.length, 'search terms from JSON');
  return data.patterns;
}

// ============================================================================
// PUBLIC API: DATA SAVING (Future Implementation)
// ============================================================================

// Basically, we want to give the user their own copy of search-terms.json, and
// they can edit it and save the changes locally through cookies or something.

/**
 * Save a new search term object to the JSON file
 *
 * TODO: Implement this function to add a new search term
 * Note: This will require file system access, which may not be possible
 * in a browser environment. Consider using a backend API for this.
 */
export function saveSearchTerm(pattern: SearchPattern): void {
  // TODO: Implement save functionality
  // This might require a backend endpoint
  console.warn('saveSearchTerm not yet implemented');
}

/**
 * Update an existing search term in the JSON file
 *
 * TODO: Implement this function to modify an existing search term
 */
export function updateSearchTerm(pattern: SearchPattern): void {
  // TODO: Implement update functionality
  console.warn('updateSearchTerm not yet implemented');
}

/**
 * Delete a search term from the JSON file
 *
 * TODO: Implement this function to remove a search term
 */
export function deleteSearchTerm(patternId: string): void {
  // TODO: Implement delete functionality
  console.warn('deleteSearchTerm not yet implemented');
}



