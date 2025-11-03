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

import { generateRandomSearchTerm, type FilterOptions } from './method-logic.js';
import searchTermsData from './search-terms.json' with { type: "json" };

// Import types from method-logic
import type { SearchPattern, Constraint } from './method-logic.js';

// ============================================================================
// NEW PUBLIC API: SEARCH TERM FORMATTING
// ============================================================================

/**
 * Format a search term object into a complete YouTube search URL
 *
 * TODO: Implement this function to:
 * 1. Generate the specifier value (name + specifier template filled in)
 * 2. Apply date filters based on pattern age and constraints
 * 3. Add YouTube-specific parameters (sort order, etc.)
 * 4. Encode and return the complete URL
 *
 * @param pattern - The search pattern object to format
 * @param overrideDate - Optional date override for custom date filtering
 * @returns Complete YouTube search URL ready to open
 */
export function formatSearchTermToURL(pattern: SearchPattern, overrideDate?: Date): string {
  // TODO: Implement this function
  // This will be the main entry point called by +page.svelte

  // Steps:
  // 1. Generate specifier value using generateSpecifierValue()
  // 2. Combine name + specifier to create search term
  // 3. Apply date filters (before:YYYY/MM/DD) based on pattern.age
  // 4. Add sort parameters for new vs old
  // 5. Encode and build YouTube URL

  console.warn('formatSearchTermToURL not yet implemented');
  return '';
}

// ============================================================================
// HELPER FUNCTIONS: SPECIFIER GENERATION
// ============================================================================

/**
 * Generate a specifier value by filling in template placeholders
 *
 * TODO: Move this logic from method-logic.ts
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
  // TODO: Move implementation from method-logic.ts
  return '';
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
 *
 * TODO: Move this logic from method-logic.ts
 */
function parseRangeConstraint(value: string): { min: number; max: number } | null {
  // TODO: Move implementation from method-logic.ts
  return null;
}

/**
 * Generate a random integer between min and max (inclusive)
 *
 * TODO: Move this logic from method-logic.ts
 */
function getRandomInt(min: number, max: number): number {
  // TODO: Move implementation from method-logic.ts
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get a random element from an array
 *
 * TODO: Move this logic from method-logic.ts
 */
function getRandomElement<T>(array: T[]): T {
  // TODO: Move implementation from method-logic.ts
  return array[Math.floor(Math.random() * array.length)];
}

// ============================================================================
// DEPRECATED: OLD SETTINGS MANAGER CLASS
// ============================================================================
// This entire class will be removed once +page.svelte is refactored
// The new approach doesn't need a settings class - just direct function calls

export class SearchSettings {
  // Active filters
  private enabledGenres: Set<string> = new Set();
  private enabledAges: Set<'new' | 'old'> = new Set(['new', 'old']); // Both enabled by default
  private excludedPatternNames: Set<string> = new Set();

  // Available genre list (can be expanded)
  private readonly availableGenres = [
    'Smartphone', 'Camera', 'Misc', 'Webcam', 'Video Editor', 'App',
    'Screen Recorder', 'VHS', 'Game Capture', 'Format', 'Zoom',
    'VR Headset', 'GoPro', 'Drone', 'Nintendo DS', 'Dashcam',
    'iPhone', 'Body Cam', 'NSFW'
  ];

  // ============================================================================
  // GENRE MANAGEMENT
  // ============================================================================

  /**
   * Enable a specific genre for searches
   */
  enableGenre(genre: string): void {
    this.enabledGenres.add(genre);
    console.log(`Genre "${genre}" enabled`);
  }

  /**
   * Disable a specific genre from searches
   */
  disableGenre(genre: string): void {
    this.enabledGenres.delete(genre);
    console.log(`Genre "${genre}" disabled`);
  }

  /**
   * Toggle a genre on/off
   */
  toggleGenre(genre: string): void {
    if (this.enabledGenres.has(genre)) {
      this.disableGenre(genre);
    } else {
      this.enableGenre(genre);
    }
  }

  /**
   * Enable all genres
   */
  enableAllGenres(): void {
    this.enabledGenres.clear(); // Empty set = no filter = all genres
    console.log('All genres enabled');
  }

  /**
   * Get list of currently enabled genres
   */
  getEnabledGenres(): string[] {
    if (this.enabledGenres.size === 0) {
      return ['All genres'];
    }
    return Array.from(this.enabledGenres);
  }

  /**
   * Get list of all available genres
   */
  getAvailableGenres(): string[] {
    return [...this.availableGenres];
  }

  // ============================================================================
  // AGE MANAGEMENT
  // ============================================================================

  /**
   * Enable "new" age category
   */
  enableNew(): void {
    this.enabledAges.add('new');
    console.log('New patterns enabled');
  }

  /**
   * Disable "new" age category
   */
  disableNew(): void {
    this.enabledAges.delete('new');
    console.log('New patterns disabled');
  }

  /**
   * Enable "old" age category
   */
  enableOld(): void {
    this.enabledAges.add('old');
    console.log('Old patterns enabled');
  }

  /**
   * Disable "old" age category
   */
  disableOld(): void {
    this.enabledAges.delete('old');
    console.log('Old patterns disabled');
  }

  /**
   * Toggle "new" age category
   */
  toggleNew(): void {
    if (this.enabledAges.has('new')) {
      this.disableNew();
    } else {
      this.enableNew();
    }
  }

  /**
   * Toggle "old" age category
   */
  toggleOld(): void {
    if (this.enabledAges.has('old')) {
      this.disableOld();
    } else {
      this.enableOld();
    }
  }

  /**
   * Check if new patterns are enabled
   */
  isNewEnabled(): boolean {
    return this.enabledAges.has('new');
  }

  /**
   * Check if old patterns are enabled
   */
  isOldEnabled(): boolean {
    return this.enabledAges.has('old');
  }

  // ============================================================================
  // PATTERN EXCLUSION
  // ============================================================================

  /**
   * Exclude a specific pattern by name from searches
   */
  excludePattern(patternName: string): void {
    this.excludedPatternNames.add(patternName);
    console.log(`Pattern "${patternName}" excluded from searches`);
  }

  /**
   * Re-include a previously excluded pattern
   */
  includePattern(patternName: string): void {
    this.excludedPatternNames.delete(patternName);
    console.log(`Pattern "${patternName}" included in searches`);
  }

  /**
   * Toggle pattern inclusion/exclusion
   */
  togglePattern(patternName: string): void {
    if (this.excludedPatternNames.has(patternName)) {
      this.includePattern(patternName);
    } else {
      this.excludePattern(patternName);
    }
  }

  /**
   * Clear all pattern exclusions
   */
  clearExclusions(): void {
    this.excludedPatternNames.clear();
    console.log('All pattern exclusions cleared');
  }

  /**
   * Get list of excluded patterns
   */
  getExcludedPatterns(): string[] {
    return Array.from(this.excludedPatternNames);
  }

  // ============================================================================
  // RESET
  // ============================================================================

  /**
   * Reset all settings to defaults
   */
  resetToDefaults(): void {
    this.enabledGenres.clear();
    this.enabledAges = new Set(['new', 'old']);
    this.excludedPatternNames.clear();
    console.log('Settings reset to defaults');
  }

  // ============================================================================
  // SEARCH TERM GENERATION
  // ============================================================================

  /**
   * Generate a random search term based on current settings
   * Returns the search term or null if no patterns match the filters
   * Automatically prints the search term to console
   * @param overrideDate - Optional date to override all date generation
   */
  generateSearchTerm(overrideDate?: Date): string | null {
    const result = this.generateSearchTermWithPattern(overrideDate);
    return result ? result.searchTerm : null;
  }

  /**
   * Generate a random search term with pattern info based on current settings
   * Returns object with searchTerm and pattern age, or null if no patterns match
   * @param overrideDate - Optional date to override all date generation
   */
  generateSearchTermWithPattern(overrideDate?: Date): { searchTerm: string; age: 'new' | 'old' | '' } | null {
    // Build filter options based on current settings
    const filters: FilterOptions = {};

    // Apply genre filter only if specific genres are enabled
    if (this.enabledGenres.size > 0) {
      // Note: method-logic only supports single genre filter
      // If multiple genres enabled, we'll need to call multiple times
      // For now, pick a random enabled genre
      const genresArray = Array.from(this.enabledGenres);
      filters.genre = genresArray[Math.floor(Math.random() * genresArray.length)];
    }

    // Apply age filter if only one is enabled
    if (this.enabledAges.size === 1) {
      filters.age = Array.from(this.enabledAges)[0];
    }
    // If both or neither are enabled, don't filter by age

    try {
      // Generate multiple attempts to avoid excluded patterns
      let attempts = 0;
      const maxAttempts = 50;

      while (attempts < maxAttempts) {
        const searchTerm = generateRandomSearchTerm({
          filters,
          overrideDate
        });

        // Check if this pattern is excluded
        let isExcluded = false;
        for (const excludedName of this.excludedPatternNames) {
          if (searchTerm.startsWith(excludedName)) {
            isExcluded = true;
            break;
          }
        }

        if (!isExcluded) {
          // Get pattern info to retrieve age
          const patternInfo = this.getPatternInfoForTerm(searchTerm);
          const age = patternInfo?.age || '';

          // Print search term and age to console for debugging
          console.log(searchTerm, `(age: ${age})`);
          return { searchTerm, age };
        }

        attempts++;
      }

      // If we exhausted attempts, all matching patterns might be excluded
      console.warn('Could not generate search term - all matching patterns may be excluded');
      return null;

    } catch (error) {
      console.error('Error generating search term:', error);
      return null;
    }
  }

  /**
   * Helper method to get pattern info for a search term
   */
  private getPatternInfoForTerm(searchTerm: string) {
    const data = searchTermsData as any;
    const allPatterns = data.patterns;

    // Find the longest matching pattern name
    // This handles cases where multiple patterns could match (e.g., empty string)
    let bestMatch = null;
    let longestMatch = -1;

    for (const pattern of allPatterns) {
      const name = pattern.name;
      if (searchTerm.startsWith(name) && name.length > longestMatch) {
        bestMatch = pattern;
        longestMatch = name.length;
      }
    }

    return bestMatch;
  }

  /**
   * Print current settings to console
   * @deprecated Will be removed - debugging only
   */
  printSettings(): void {
    console.log('=== Search Settings ===');
    console.log('Enabled Genres:', this.getEnabledGenres().join(', '));
    console.log('New Patterns:', this.isNewEnabled() ? 'Enabled' : 'Disabled');
    console.log('Old Patterns:', this.isOldEnabled() ? 'Enabled' : 'Disabled');
    console.log('Excluded Patterns:', this.getExcludedPatterns().join(', ') || 'None');
    console.log('=====================');
  }
}
// END OF DEPRECATED SearchSettings CLASS

// ============================================================================
// DEPRECATED: CONVENIENCE FUNCTIONS
// ============================================================================
// These functions will be removed once the refactoring is complete

/**
 * DEBUG: Generate and print a random search term with no filters
 * @deprecated Use formatSearchTermToURL() instead
 */
export function debugPrintRandomTerm(): void {
  const term = generateRandomSearchTerm();
  console.log(term);
}

/**
 * Create a new SearchSettings instance
 * @deprecated The new approach doesn't use a settings class
 */
export function createSearchSettings(): SearchSettings {
  return new SearchSettings();
}

/**
 * Default settings instance for convenience
 * @deprecated The new approach doesn't use a settings class
 */
export const defaultSettings = new SearchSettings();
