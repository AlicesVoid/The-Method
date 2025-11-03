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
  specifier: string;  // "YYYY MM" | "YMD" | "HMS" | "Y" | "Month DD, YYYY" | "XXXX" | ""
  genre: string;
  age: 'new' | 'old' | '';
  constraints: Constraint[];
}

interface SearchTermsData {
  patterns: SearchPattern[];
}

interface FilterOptions {
  age?: 'new' | 'old';
  genre?: string;
  hasConstraints?: boolean;
}

interface GenerateOptions {
  filters?: FilterOptions;
  overrideName?: string;
  overrideSpecifierValue?: string;
  overrideDate?: Date;
}

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
  return data.patterns;
}

// ============================================================================
// PUBLIC API: DATA SAVING (Future Implementation)
// ============================================================================

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

// ============================================================================
// DEPRECATED FUNCTIONS (To be removed after refactoring)
// ============================================================================
// These functions are kept temporarily for backward compatibility
// but should be removed once search-settings.ts is fully refactored

function loadSearchTerms(): SearchTermsData {
  return searchTermsData as SearchTermsData;
}

function getAllPatterns(data: SearchTermsData): SearchPattern[] {
  return data.patterns;
}

function filterPatterns(patterns: SearchPattern[], filters?: FilterOptions, overrideDate?: Date): SearchPattern[] {
  // TODO: Move this logic to search-settings.ts
  let filtered = patterns;

  if (filters) {
    if (filters.age) {
      filtered = filtered.filter(p => p.age === filters.age || p.age === '');
    }
    if (filters.genre) {
      filtered = filtered.filter(p => p.genre === filters.genre);
    }
    if (filters.hasConstraints !== undefined) {
      filtered = filtered.filter(p =>
        filters.hasConstraints ? p.constraints.length > 0 : p.constraints.length === 0
      );
    }
  }

  filtered = filtered.filter(p => meetsDateConstraints(p, overrideDate));
  return filtered;
}

function meetsDateConstraints(pattern: SearchPattern, date?: Date): boolean {
  // TODO: Move this logic to search-settings.ts
  const dateConstraint = pattern.constraints.find(c => c.type === 'date-before' || c.type === 'date-after');
  if (!dateConstraint) return true;

  const checkDate = date || new Date();
  const checkYear = checkDate.getFullYear();
  const constraintYear = typeof dateConstraint.value === 'string'
    ? parseInt(dateConstraint.value, 10)
    : dateConstraint.value;

  // For date-before: check year must be >= constraint year
  // For date-after: check year must be <= constraint year
  if (dateConstraint.type === 'date-before') {
    return checkYear >= constraintYear;
  } else {
    return checkYear <= constraintYear;
  }
}

function getRandomElement<T>(array: T[]): T {
  // TODO: Move to search-settings.ts or +page.svelte
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  // TODO: Move to search-settings.ts
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parseRangeConstraint(value: string): { min: number; max: number } | null {
  // TODO: Move to search-settings.ts
  const parts = value.split('-');
  if (parts.length !== 2) return null;

  let min: number;
  let max: number;

  if (/[A-Fa-f]/.test(value)) {
    min = parseInt(parts[0], 16);
    max = parseInt(parts[1], 16);
  } else {
    min = parseInt(parts[0], 10);
    max = parseInt(parts[1], 10);
  }

  return { min, max };
}

function generateSpecifierValue(
  specifier: string,
  pattern: SearchPattern,
  overrideValue?: string,
  overrideDate?: Date
): string {
  // TODO: Move this entire function to search-settings.ts
  // This is a large function that handles all specifier generation logic
  // For now, keeping it here for backward compatibility

  if (overrideValue) return overrideValue;
  if (!specifier) return '';

  let result = specifier;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const isNew = pattern.age === 'new';
  const isOld = pattern.age === 'old';

  // [All the existing specifier generation logic remains for now]
  // This will be moved to search-settings.ts in the next step

  if (specifier.includes('YYYY MM DD')) {
    let year: number, month: string, day: string;
    if (overrideDate) {
      year = overrideDate.getFullYear();
      month = String(overrideDate.getMonth() + 1).padStart(2, '0');
      day = String(overrideDate.getDate()).padStart(2, '0');
    } else if (isNew) {
      year = currentYear;
      month = String(currentMonth).padStart(2, '0');
      day = String(currentDay).padStart(2, '0');
    } else if (isOld) {
      year = getRandomInt(2010, 2015);
      month = String(getRandomInt(1, 12)).padStart(2, '0');
      day = String(getRandomInt(1, 28)).padStart(2, '0');
    } else {
      year = getRandomInt(2010, currentYear);
      month = String(getRandomInt(1, 12)).padStart(2, '0');
      day = String(getRandomInt(1, 28)).padStart(2, '0');
    }
    result = result.replace('YYYY MM DD', `${year} ${month} ${day}`);
  }
  else if (specifier.includes('YYYYMMDD')) {
    let year: number, month: string, day: string;
    if (overrideDate) {
      year = overrideDate.getFullYear();
      month = String(overrideDate.getMonth() + 1).padStart(2, '0');
      day = String(overrideDate.getDate()).padStart(2, '0');
    } else if (isNew) {
      year = currentYear;
      month = String(currentMonth).padStart(2, '0');
      day = String(currentDay).padStart(2, '0');
    } else if (isOld) {
      year = getRandomInt(2010, 2015);
      month = String(getRandomInt(1, 12)).padStart(2, '0');
      day = String(getRandomInt(1, 28)).padStart(2, '0');
    } else {
      year = getRandomInt(2010, currentYear);
      month = String(getRandomInt(1, 12)).padStart(2, '0');
      day = String(getRandomInt(1, 28)).padStart(2, '0');
    }
    result = result.replace('YYYYMMDD', `${year}${month}${day}`);
  }
  else if (specifier.includes('YYYY MM')) {
    let year: number, month: string;
    if (overrideDate) {
      year = overrideDate.getFullYear();
      month = String(overrideDate.getMonth() + 1).padStart(2, '0');
    } else if (isNew) {
      year = currentYear;
      month = String(currentMonth).padStart(2, '0');
    } else if (isOld) {
      year = getRandomInt(2010, 2015);
      month = String(getRandomInt(1, 12)).padStart(2, '0');
    } else {
      year = getRandomInt(2010, currentYear);
      month = String(getRandomInt(1, 12)).padStart(2, '0');
    }
    result = result.replace('YYYY MM', `${year} ${month}`);
  }
  else if (specifier.includes('Month DD, YYYY')) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    let year: number, month: string, day: number;
    if (overrideDate) {
      year = overrideDate.getFullYear();
      month = months[overrideDate.getMonth()];
      day = overrideDate.getDate();
    } else if (isNew) {
      year = currentYear;
      month = months[currentMonth - 1];
      day = currentDay;
    } else if (isOld) {
      year = getRandomInt(2010, 2015);
      month = getRandomElement(months);
      day = getRandomInt(1, 28);
    } else {
      year = getRandomInt(2010, currentYear);
      month = getRandomElement(months);
      day = getRandomInt(1, 28);
    }
    result = result.replace('Month DD, YYYY', `${month} ${day}, ${year}`);
  }
  else if (specifier.includes('YYYY')) {
    let year: number;
    if (overrideDate) {
      year = overrideDate.getFullYear();
    } else if (isNew) {
      year = currentYear;
    } else if (isOld) {
      year = getRandomInt(2010, 2015);
    } else {
      year = getRandomInt(2010, currentYear);
    }
    result = result.replace('YYYY', String(year));
  }
  else if (specifier.includes('HHMMSS')) {
    let hour: number, minute: number, second: number;
    if (overrideDate) {
      hour = overrideDate.getHours();
      minute = overrideDate.getMinutes();
      second = overrideDate.getSeconds();
    } else {
      const timeConstraint = pattern.constraints.find((c: Constraint) => c.type === 'range' || c.type === 'time-range');
      if (timeConstraint) {
        const range = parseRangeConstraint(String(timeConstraint.value));
        if (range) {
          const randomTime = getRandomInt(range.min, range.max);
          hour = Math.floor(randomTime / 10000);
          minute = Math.floor((randomTime % 10000) / 100);
          second = randomTime % 100;
        } else {
          hour = getRandomInt(0, 23);
          minute = getRandomInt(0, 59);
          second = getRandomInt(0, 59);
        }
      } else {
        hour = getRandomInt(0, 23);
        minute = getRandomInt(0, 59);
        second = getRandomInt(0, 59);
      }
    }
    const hourStr = String(hour).padStart(2, '0');
    const minuteStr = String(minute).padStart(2, '0');
    const secondStr = String(second).padStart(2, '0');
    result = result.replace('HHMMSS', `${hourStr}${minuteStr}${secondStr}`);
  }

  const xPatterns = [
    { pattern: 'XXXX', digits: 4 },
    { pattern: 'XXX', digits: 3 },
    { pattern: 'XX', digits: 2 },
    { pattern: 'X', digits: 1 }
  ];

  const rangeConstraint = pattern.constraints.find(c => c.type === 'range');
  let constraintMin: number | null = null;
  let constraintMax: number | null = null;

  if (rangeConstraint) {
    const range = parseRangeConstraint(String(rangeConstraint.value));
    if (range) {
      constraintMin = range.min;
      constraintMax = range.max;
    }
  }

  for (const { pattern: xPattern, digits } of xPatterns) {
    while (result.includes(xPattern)) {
      let randomNum: number;
      if (constraintMin !== null && constraintMax !== null) {
        randomNum = getRandomInt(constraintMin, constraintMax);
      } else {
        const max = Math.pow(10, digits) - 1;
        randomNum = getRandomInt(0, max);
      }
      const paddedNum = String(randomNum).padStart(digits, '0');
      result = result.replace(xPattern, paddedNum);
    }
  }

  return result;
}

export function generateRandomSearchTerm(options?: GenerateOptions): string {
  // DEPRECATED: This function will be removed
  // Use the new approach: +page.svelte selects random term, search-settings.ts formats it
  const data = loadSearchTerms();
  const allPatterns = getAllPatterns(data);
  const filtered = filterPatterns(allPatterns, options?.filters, options?.overrideDate);

  if (filtered.length === 0) {
    throw new Error('No patterns match the specified filters');
  }

  const pattern = getRandomElement(filtered);
  const name = options?.overrideName ?? pattern.name;
  const specifierValue = generateSpecifierValue(
    pattern.specifier,
    pattern,
    options?.overrideSpecifierValue,
    options?.overrideDate
  );

  const searchTerm = name + specifierValue;
  return searchTerm.trim();
}

export function getPatternInfo(searchTerm: string): SearchPattern | null {
  // DEPRECATED: Will be removed
  const data = loadSearchTerms();
  const allPatterns = getAllPatterns(data);

  for (const pattern of allPatterns) {
    if (searchTerm.startsWith(pattern.name)) {
      return pattern;
    }
  }

  return null;
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type { SearchPattern, FilterOptions, GenerateOptions, Constraint };
