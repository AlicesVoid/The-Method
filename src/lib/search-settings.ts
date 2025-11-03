/**
 * Search Settings - Search Term Formatting & YouTube URL Generation
 *
 * REFACTORED RESPONSIBILITIES:
 * This module is now responsible for taking a search term object (selected by +page.svelte)
 * and formatting it into a complete YouTube search URL.
 *
 * NEW FUNCTIONS:
 *  - formatSearchTermToURL(): Takes a SearchPattern object and returns a formatted YouTube URL
 *  - generateSpecifierValue(): Fills in specifier templates (YYYY, XXXX, etc.) with actual values
 *  - meetsDateConstraints(): Checks if a pattern meets date constraints
 *  - Helper functions for date/time generation and constraint parsing
 *
 * WORKFLOW:
 *  1. +page.svelte selects a random SearchPattern from the active subset
 *  2. Pass that object to formatSearchTermToURL()
 *  3. This function generates the specifier, applies constraints, and formats the YouTube URL
 *  4. Returns the complete URL ready to open in a new tab
 */

// Import types from method-logic
import type { SearchPattern, Constraint } from './method-logic.js';

// ============================================================================
// NEW PUBLIC API: SEARCH TERM FORMATTING
// ============================================================================

/**
 * Format a search term object into a complete YouTube search URL
 *
 * @param pattern - The search pattern object to format
 * @param specifier - The specific specifier to use from pattern.specifiers
 * @param overrideDate - Optional date override for custom date filtering
 * @returns Complete YouTube search URL ready to open
 */
export function formatSearchTermToURL(
  pattern: SearchPattern,
  specifier: string,
  formattedDate: Date,
): string {

  // 1. Generate the specifier value
  const specifierValue = generateSpecifierValue(specifier, pattern, formattedDate);

  // 2. Combine name + specifier to create the search term
  let searchTerm = pattern.name;
  if (specifierValue) {
    searchTerm = `${pattern.name} ${specifierValue}`;
  }

  // 3. Add date filters based on pattern age
  const dateFilters: string[] = [];

  if (pattern.age === 'new') {
    // For new content, search for videos uploaded in the last year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const afterDate = `${oneYearAgo.getFullYear()}-${String(oneYearAgo.getMonth() + 1).padStart(2, '0')}-${String(oneYearAgo.getDate()).padStart(2, '0')}`;
    dateFilters.push(`after:${afterDate}`);
  } else if (pattern.age === 'old') {
    // For old content, search for videos uploaded before a certain date
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const beforeDate = `${fiveYearsAgo.getFullYear()}-${String(fiveYearsAgo.getMonth() + 1).padStart(2, '0')}-${String(fiveYearsAgo.getDate()).padStart(2, '0')}`;
    dateFilters.push(`before:${beforeDate}`);
  }

  // Apply constraint-based date filters
  for (const constraint of pattern.constraints) {
    if (constraint.type === 'date-before') {
      const date = new Date(constraint.value);
      const beforeDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dateFilters.push(`before:${beforeDate}`);
    } else if (constraint.type === 'date-after') {
      const date = new Date(constraint.value);
      const afterDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dateFilters.push(`after:${afterDate}`);
    }
  }

  // Combine search term with date filters
  const fullSearchTerm = [searchTerm, ...dateFilters].join(' ');

  // 4. Build YouTube search URL with appropriate parameters
  const params = new URLSearchParams({
    search_query: fullSearchTerm
  });

  // Add sort order based on age preference
  if (pattern.age === 'new') {
    // Sort by upload date (newest first)
    params.append('sp', 'CAI%253D'); // Upload date sort
  } else if (pattern.age === 'old') {
    // Sort by upload date (oldest first)
    params.append('sp', 'CAoSAhAB'); // Upload date sort (old)
  }

  // 5. Return the complete YouTube URL
  return `https://www.youtube.com/results?${params.toString()}`;
}

// ============================================================================
// HELPER FUNCTIONS: SPECIFIER GENERATION
// ============================================================================

/*
 * Generate a random date for the video (if there's no overrideDate)
 */
function generateSpecifierDate(overrideDate?: Date): Date {
  if (!overrideDate) {

    // if "old", pick random date in the last 10 years

    // if "new", pick random date in the last year

    return date;
  }
  return overrideDate;
}


/**
 * Generate a specifier value by filling in template placeholders
 * Handles templates like:
 * - YYYY MM DD -> 2024 03 15
 * - XXXX -> 1234
 * - HHMMSS -> 143059
 */
function generateSpecifierValue(
  specifier: string,
  pattern: SearchPattern,
  overrideDate?: Date
): string {
  if (!specifier || specifier === '') return '';

  const date = overrideDate || new Date();
  let result = specifier;

  // Process constraints to determine valid ranges
  const yearConstraints: number[] = [];
  const dateConstraints: { before?: Date; after?: Date } = {};

  for (const constraint of pattern.constraints) {
    if (constraint.type === 'year') {
      yearConstraints.push(Number(constraint.value));
    } else if (constraint.type === 'date-before') {
      dateConstraints.before = new Date(constraint.value);
    } else if (constraint.type === 'date-after') {
      dateConstraints.after = new Date(constraint.value);
    }
  }

  // Replace date/time placeholders
  // YYYY - Year (4 digits)
  if (result.includes('YYYY')) {
    let year: number;
    if (yearConstraints.length > 0) {
      year = getRandomElement(yearConstraints);
    } else if (dateConstraints.before || dateConstraints.after) {
      const minYear = dateConstraints.after?.getFullYear() || 2005;
      const maxYear = dateConstraints.before?.getFullYear() || date.getFullYear();
      year = getRandomInt(minYear, maxYear);
    } else {
      year = date.getFullYear();
    }
    result = result.replace(/YYYY/g, year.toString());
  }

  // MM - Month (01-12)
  if (result.includes('MM')) {
    const month = getRandomInt(1, 12).toString().padStart(2, '0');
    result = result.replace(/MM/g, month);
  }

  // DD - Day (01-31)
  if (result.includes('DD')) {
    const day = getRandomInt(1, 28).toString().padStart(2, '0'); // Using 28 to avoid month-specific issues
    result = result.replace(/DD/g, day);
  }

  // HH - Hours (00-23)
  if (result.includes('HH')) {
    const hours = getRandomInt(0, 23).toString().padStart(2, '0');
    result = result.replace(/HH/g, hours);
  }

  // mm - Minutes (00-59)
  if (result.includes('mm')) {
    const minutes = getRandomInt(0, 59).toString().padStart(2, '0');
    result = result.replace(/mm/g, minutes);
  }

  // SS - Seconds (00-59)
  if (result.includes('SS')) {
    const seconds = getRandomInt(0, 59).toString().padStart(2, '0');
    result = result.replace(/SS/g, seconds);
  }

  // XXXX - 4-digit random number (check for range constraints)
  if (result.includes('XXXX')) {
    let min = 1000;
    let max = 9999;

    for (const constraint of pattern.constraints) {
      if (constraint.type === 'range') {
        const range = parseRangeConstraint(String(constraint.value));
        if (range) {
          min = range.min;
          max = range.max;
        }
      }
    }

    const num = getRandomInt(min, max);
    result = result.replace(/XXXX/g, num.toString());
  }

  // XXX - 3-digit random number
  if (result.includes('XXX')) {
    const num = getRandomInt(100, 999);
    result = result.replace(/XXX/g, num.toString());
  }

  // XX - 2-digit random number
  if (result.includes('XX')) {
    const num = getRandomInt(10, 99);
    result = result.replace(/XX/g, num.toString());
  }

  // X - 1-digit random number
  if (result.includes('X')) {
    const num = getRandomInt(0, 9);
    result = result.replace(/X/g, num.toString());
  }

  return result;
}

/**
 * Check if a pattern meets date constraints
 *
 * TODO: Move this logic from method-logic.ts
 */
function meetsDateConstraints(pattern: SearchPattern, date?: Date): boolean {
  // TODO: Move implementation from method-logic.ts
  return true;
}

/**
 * Parse a range constraint value
 * Format: "min-max" like "1000-9999" or "1-12"
 */
function parseRangeConstraint(value: string): { min: number; max: number } | null {
  const parts = value.split('-');
  if (parts.length !== 2) return null;

  const min = parseInt(parts[0], 10);
  const max = parseInt(parts[1], 10);

  if (isNaN(min) || isNaN(max)) return null;

  return { min, max };
}

/**
 * Generate a random integer between min and max (inclusive)
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get a random element from an array
 */
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
