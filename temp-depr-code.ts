

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


// ============================================================================ FROM search-settings.ts


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
