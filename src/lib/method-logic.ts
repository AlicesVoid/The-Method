/**
 * Method Logic - Video Search Pattern Manager
 *
 * This module handles the organization and parsing of video search patterns
 * Each pattern consists of multiple components that define how to search for videos
 */

import searchTermsData from './search-terms.json' with { type: "json" };

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Constraint {
  type: 'year' | 'date' | 'range' | 'time-range' | 'letter-range' | 'filter' | 'category';
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
  "new-patterns": SearchPattern[];
  "old-patterns": SearchPattern[];
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
// DATA LOADING
// ============================================================================

function loadSearchTerms(): SearchTermsData {
  return searchTermsData as SearchTermsData;
}

function getAllPatterns(data: SearchTermsData): SearchPattern[] {
  return [...data['new-patterns'], ...data['old-patterns']];
}

// ============================================================================
// FILTERING
// ============================================================================

function filterPatterns(patterns: SearchPattern[], filters?: FilterOptions, overrideDate?: Date): SearchPattern[] {
  let filtered = patterns;

  // Apply general filters if provided
  if (filters) {
    // Filter by age ("" matches both new and old)
    if (filters.age) {
      filtered = filtered.filter(p => p.age === filters.age || p.age === '');
    }

    // Filter by genre
    if (filters.genre) {
      filtered = filtered.filter(p => p.genre === filters.genre);
    }

    // Filter by whether it has constraints
    if (filters.hasConstraints !== undefined) {
      filtered = filtered.filter(p =>
        filters.hasConstraints ? p.constraints.length > 0 : p.constraints.length === 0
      );
    }
  }

  // Always check date constraints (using override date or current date)
  filtered = filtered.filter(p => meetsDateConstraints(p, overrideDate));

  return filtered;
}

/**
 * Check if a pattern meets date constraints based on the given date
 * Returns true if the pattern should be included, false if it should be filtered out
 */
function meetsDateConstraints(pattern: SearchPattern, date?: Date): boolean {
  const dateConstraint = pattern.constraints.find(c => c.type === 'date');

  if (!dateConstraint) {
    // No date constraint means the pattern is always valid
    return true;
  }

  // If no date is provided, use current date
  const checkDate = date || new Date();
  const checkYear = checkDate.getFullYear();

  // The constraint value should be a year (string or number)
  const constraintYear = typeof dateConstraint.value === 'string'
    ? parseInt(dateConstraint.value, 10)
    : dateConstraint.value;

  // Filter out if the check date's year is earlier than the constraint year
  return checkYear >= constraintYear;
}

// ============================================================================
// RANDOM SELECTION
// ============================================================================

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================================
// SPECIFIER GENERATION
// ============================================================================

/**
 * Parse a range constraint value to extract min and max
 * Examples: "0000-1050" -> {min: 0, max: 1050}, "00-F9" -> {min: 0, max: 249}
 */
function parseRangeConstraint(value: string): { min: number; max: number } | null {
  const parts = value.split('-');
  if (parts.length !== 2) return null;

  let min: number;
  let max: number;

  // Check if it's hexadecimal (contains A-F)
  if (/[A-Fa-f]/.test(value)) {
    min = parseInt(parts[0], 16);
    max = parseInt(parts[1], 16);
  } else {
    min = parseInt(parts[0], 10);
    max = parseInt(parts[1], 10);
  }

  return { min, max };
}

/**
 * Generate specifier value based on pattern, age, and constraints
 */
function generateSpecifierValue(
  specifier: string,
  pattern: SearchPattern,
  overrideValue?: string,
  overrideDate?: Date
): string {
  if (overrideValue) return overrideValue;
  if (!specifier) return '';

  let result = specifier;

  // Get date values - either from override or based on pattern age
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  // Determine if pattern is "new" (use current date) or "old" (use random 2010-2015)
  const isNew = pattern.age === 'new';
  const isOld = pattern.age === 'old';

  // YYYY MM DD (with spaces)
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

  // YYYYMMDD (no spaces)
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

  // YYYY MM (year and month)
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

  // Month DD, YYYY (written format like "January 15, 2023")
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

  // YYYY (just year)
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

  // HHMMSS (time format)
  else if (specifier.includes('HHMMSS')) {
    let hour: number, minute: number, second: number;

    if (overrideDate) {
      // Use override date's time
      hour = overrideDate.getHours();
      minute = overrideDate.getMinutes();
      second = overrideDate.getSeconds();
    } else {
      // Check for time-range constraint
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

  // Handle X placeholders (XXXX, XXX, XX, X)
  // Process in order from longest to shortest to avoid partial replacements
  const xPatterns = [
    { pattern: 'XXXX', digits: 4 },
    { pattern: 'XXX', digits: 3 },
    { pattern: 'XX', digits: 2 },
    { pattern: 'X', digits: 1 }
  ];

  // Find range constraint for X placeholders
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

      // Use constraint range if available
      if (constraintMin !== null && constraintMax !== null) {
        randomNum = getRandomInt(constraintMin, constraintMax);
      } else {
        // Default behavior: generate random number with correct digits
        const max = Math.pow(10, digits) - 1;
        randomNum = getRandomInt(0, max);
      }

      // Pad the number to the correct length
      const paddedNum = String(randomNum).padStart(digits, '0');
      result = result.replace(xPattern, paddedNum);
    }
  }

  return result;
}

// ============================================================================
// MAIN FUNCTION: GENERATE RANDOM SEARCH TERM
// ============================================================================

export function generateRandomSearchTerm(options?: GenerateOptions): string {
  const data = loadSearchTerms();
  const allPatterns = getAllPatterns(data);

  // Filter patterns based on options (including date constraints)
  const filtered = filterPatterns(allPatterns, options?.filters, options?.overrideDate);

  if (filtered.length === 0) {
    throw new Error('No patterns match the specified filters');
  }

  // Pick a random pattern
  const pattern = getRandomElement(filtered);

  // Use override name if provided, otherwise use pattern name
  const name = options?.overrideName ?? pattern.name;

  // Generate specifier value
  const specifierValue = generateSpecifierValue(
    pattern.specifier,
    pattern,
    options?.overrideSpecifierValue,
    options?.overrideDate
  );

  // Combine name and specifier to create final search term
  const searchTerm = name + specifierValue;

  return searchTerm.trim();
}

// ============================================================================
// HELPER FUNCTION: GET PATTERN INFO
// ============================================================================

export function getPatternInfo(searchTerm: string): SearchPattern | null {
  const data = loadSearchTerms();
  const allPatterns = getAllPatterns(data);

  // Try to find a matching pattern by name
  // This is a simple implementation - could be enhanced with better matching logic
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
