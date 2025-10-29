/**
 * Search Settings - User-facing controls for video search
 *
 * This module provides a settings manager that users can interact with to:
 * - Toggle genre filters
 * - Toggle age filters (new/old)
 * - Add/remove individual patterns from the search pool
 * - Generate random search terms based on their preferences
 */

import { generateRandomSearchTerm, type FilterOptions } from './method-logic.js';

// ============================================================================
// SETTINGS MANAGER CLASS
// ============================================================================

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
          // Print search term to console
          console.log(searchTerm);
          return searchTerm;
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
   * Print current settings to console
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

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * DEBUG: Generate and print a random search term with no filters
 * This ignores all settings and just picks any random pattern
 */
export function debugPrintRandomTerm(): void {
  const term = generateRandomSearchTerm();
  console.log(term);
}

/**
 * Create a new SearchSettings instance
 */
export function createSearchSettings(): SearchSettings {
  return new SearchSettings();
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

// Export a default instance for convenience
export const defaultSettings = new SearchSettings();
