<script lang="ts">
    // ============================================================================
    // REFACTORED ARCHITECTURE OVERVIEW
    // ============================================================================
    // This file manages the UI state and user interactions for the video search randomizer.
    //
    // NEW DATA FLOW:
    // 1. +page.svelte loads ALL search term objects from JSON as a single unified list
    // 2. User filter selections update "active flags" for each search term
    // 3. When "Find Videos" is clicked:
    //    a. Randomly select one item from the active subset
    //    b. Pass it to search-settings.ts for formatting (specifier generation, date handling)
    //    c. Open the formatted YouTube URL
    //
    // RESPONSIBILITIES BY FILE:
    // - +page.svelte: Holds the full list, manages active flags, random selection
    // - method-logic.ts: Read/save JSON objects only
    // - search-settings.ts: Parse & format search terms, handle constraints, generate URLs
    //
    // ============================================================================
    // IMPORTS
    // ============================================================================
    import { base } from '$app/paths';
    import { loadAllSearchTerms, formatSearchTermToURL, type SearchPattern } from '$lib';

    // ============================================================================
    // DATA STRUCTURE: FULL LIST OF SEARCH TERM OBJECTS
    // ============================================================================

    // This is the single source of truth for all search terms
    let allSearchTerms: SearchPattern[] = loadAllSearchTerms();

    // ============================================================================
    // DERIVED LISTS FOR UI DROPDOWNS
    // ============================================================================


    // Derive all unique genres from the search terms
    // Sort alphabetically, but put NSFW at the front if it exists
    let allGenres: string[] = [];
    $: {
        const genres = Array.from(new Set(allSearchTerms.map(term => term.genre)))
            .filter(genre => genre !== '') // Remove empty genres
            .sort(); // Sort alphabetically

        // Move NSFW to the front if it exists
        if (genres.includes('NSFW')) {
            allGenres = ['NSFW', ...genres.filter(genre => genre !== 'NSFW')];
        } else {
            allGenres = genres;
        }
    }

    // Derive all unique name+specifier combinations from the search terms
    // Each unique combination will be a separate item in the dropdown
    interface NameSpecifierItem {
        name: string;
        specifier: string;
        displayKey: string; // Unique key for this combination
        showSpecifier: boolean; // Only show specifier if multiple items share the same name
    }

    // Collision Handling for Overlapping Names with Different Specifiers
    let availableNames: NameSpecifierItem[] = [];
    $: {
        const filtered = allSearchTerms
            .filter(term => selectedGenres.size === 0 || selectedGenres.has(term.genre));

        // Expand patterns with multiple specifiers into separate items
        const uniqueCombos = new Map<string, NameSpecifierItem>();

        for (const term of filtered) {
            // Each pattern can have multiple specifiers
            for (const specifier of term.specifiers) {
                const key = `${term.name}|||${specifier}`; // Use ||| as separator to avoid collisions
                if (!uniqueCombos.has(key)) {
                    uniqueCombos.set(key, {
                        name: term.name,
                        specifier: specifier,
                        displayKey: key,
                        showSpecifier: false // Will be updated below
                    });
                }
            }
        }

        const items = Array.from(uniqueCombos.values());

        // Count how many items have each name
        const nameCounts = new Map<string, number>();
        for (const item of items) {
            nameCounts.set(item.name, (nameCounts.get(item.name) || 0) + 1);
        }

        // Mark items that need to show specifiers (when multiple items share a name)
        for (const item of items) {
            item.showSpecifier = (nameCounts.get(item.name) || 0) > 1;
        }

        // Sort by name, then by specifier
        availableNames = items.sort((a, b) => {
            if (a.name !== b.name) return a.name.localeCompare(b.name);
            return a.specifier.localeCompare(b.specifier);
        });
    }

    // ============================================================================
    // STATE: ADVANCED SETTINGS
    // ============================================================================

    let showAdvancedSettings: boolean = false;

    // ============================================================================
    // STATE: DATE FILTER
    // ============================================================================

    // Default to today's date
    let beforeDate: string = (() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    })();

    let enableDateOverride: boolean = false;
    let enableUserTerms: boolean = false;
    let editCustomTerms: boolean = false;

    // ============================================================================
    // REACTIVE: AUTO-LOAD/UNLOAD CUSTOM TERMS
    // ============================================================================
    // Automatically load or remove custom terms when checkbox is toggled
    $: {
        if (enableUserTerms) {
            loadCustomTermsIntoPool();
        } else {
            removeCustomTermsFromPool();
        }
    }

    // ============================================================================
    // STATE: CUSTOM SEARCH TERM BUILDER
    // ============================================================================
    let customName: string = '';
    let customSpecifiersList: string[] = ['']; // Array of individual specifiers
    let customGenre: string = 'Custom'; // Default to "Custom"
    let customAge: '' | 'new' | 'old' = '';
    let customConstraintType: string = 'none'; // 'none', 'before', 'after', 'exact'
    let customConstraintDate: string = '';
    let showMoreInfo: boolean = false; // Toggle for optional fields
    let selectedTermIndex: number | null = null; // Track which term is loaded for editing

    // ============================================================================
    // STATE: IMPORT/EXPORT MANAGER
    // ============================================================================
    let manageCustomTerms: boolean = false; // Toggle for import/export form
    let selectedFile: File | null = null; // Store selected file
    let importStats: { success: number; failed: number } | null = null; // Track import results

    // ============================================================================
    // STATE: AGE FILTER
    // ============================================================================
    let selectedAge: 'any' | 'new' | 'old' = 'any';

    // ============================================================================
    // STATE: GENRE SELECTION
    // ============================================================================
    // Initialize with all genres selected except NSFW

    // Variables to hold selected genres
    let selectedGenres: Set<string> = new Set();
    let selectAllGenres: boolean = false;
    let genreDropdownOpen: boolean = false;
    let genresInitialized: boolean = false;
    let genreSearchBuffer: string = '';
    let genreSearchTimeout: number | null = null;
    let genreDropdownElement: HTMLDivElement;

    // Initialize selectedGenres after allGenres is computed (only once)
    $: if (allGenres.length > 0 && !genresInitialized) {
        selectedGenres = new Set(allGenres.filter(genre => genre !== 'NSFW'));
        genresInitialized = true;
    }

    // Sync selectAllGenres checkbox with actual selection state
    $: selectAllGenres = allGenres.length > 0 && selectedGenres.size === allGenres.length;

    // Auto-focus genre dropdown when it opens
    $: if (genreDropdownOpen && genreDropdownElement) {
        setTimeout(() => genreDropdownElement.focus(), 0);
    }
    
    // ============================================================================
    // STATE: NAME/SEARCH TERM SELECTION
    // ============================================================================
    // Stores the displayKey (name|||specifier) for each selected name+specifier combination
    // This will update the active flags for filtering the search term list

    // Variables to hold selected names
    let selectedNames: Set<string> = new Set();
    let selectAllNames: boolean = true;
    let nameDropdownOpen: boolean = false;
    let namesInitialized: boolean = false;
    let nameSearchBuffer: string = '';
    let nameSearchTimeout: number | null = null;
    let nameDropdownElement: HTMLDivElement;

    // Initialize selectedNames to all available names after they're computed (only once)
    $: if (availableNames.length > 0 && !namesInitialized) {
        selectedNames = new Set(availableNames.map(item => item.displayKey));
        namesInitialized = true;
    }

    // Sync selectAllNames checkbox with actual selection state
    $: selectAllNames = availableNames.length > 0 && selectedNames.size === availableNames.length;

    // Auto-focus name dropdown when it opens
    $: if (nameDropdownOpen && nameDropdownElement) {
        setTimeout(() => nameDropdownElement.focus(), 0);
    }

    // ============================================================================
    // REACTIVE: ACTIVE SEARCH TERM FILTERING
    // ============================================================================
    // Create a filtered list of search terms based on all active filters
    // This will be used for random selection when "Find Videos" is clicked

    let activeSearchTerms: SearchPattern[] = [];
    $: {
        activeSearchTerms = allSearchTerms.filter(pattern => {
            // Filter by genre - if no genres selected, show none
            if (selectedGenres.size > 0 && !selectedGenres.has(pattern.genre)) {
                return false;
            }

            // Filter by age (new/old/any)
            if (selectedAge !== 'any') {
                // If pattern has a specific age, it must match the selected age
                if (pattern.age !== '' && pattern.age !== selectedAge) {
                    return false;
                }
                // If pattern has no age specified (''), include it as well
                if (pattern.age === '') {
                    return true;
                }
            }

            // Filter by name+specifier combination
            // Check if any of the pattern's specifiers match a selected name
            if (selectedNames.size > 0) {
                const hasMatchingSpecifier = pattern.specifiers.some((specifier: string) => {
                    const key = `${pattern.name}|||${specifier}`;
                    return selectedNames.has(key);
                });
                if (!hasMatchingSpecifier) {
                    return false;
                }
            }

            return true;
        });
    }

    // Count of active/total search terms for display
    $: activeCount = activeSearchTerms.length;
    $: totalCount = allSearchTerms.length;

    // ============================================================================
    // FUNCTIONS: GENRE SELECTION
    // ============================================================================

    // Lets you do that cool thing where if you start typing a word it jumps to that item
    function handleGenreKeydown(event: KeyboardEvent) {
        // Only handle letter/number keys
        if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
            // Clear previous timeout
            if (genreSearchTimeout !== null) {
                clearTimeout(genreSearchTimeout);
            }

            // Add to search buffer
            genreSearchBuffer += event.key.toLowerCase();

            // Find matching genre
            const match = allGenres.find(genre =>
                genre.toLowerCase().startsWith(genreSearchBuffer)
            );

            if (match) {
                // Scroll to the matching element
                const element = document.getElementById(`genre-${match}`);
                if (element) {
                    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            }

            // Clear buffer after 1 second of no typing
            genreSearchTimeout = window.setTimeout(() => {
                genreSearchBuffer = '';
            }, 1000);
        }
    }

    // Toggle individual genre selection
    function toggleGenre(genre: string) {
        if (selectedGenres.has(genre)) {
            selectedGenres.delete(genre);
        } else {
            selectedGenres.add(genre);
        }
        selectedGenres = selectedGenres; // Trigger reactivity
    }

    // Toggle select/deselect all genres
    function toggleSelectAll() {
        if (selectedGenres.size === allGenres.length) {
            // Currently all selected, so deselect all
            selectedGenres = new Set();
        } else {
            // Not all selected, so select all
            selectedGenres = new Set(allGenres);
        }
    }

    // ============================================================================
    // FUNCTIONS: NAME SELECTION
    // ============================================================================

    // Lets you do that cool thing where if you start typing a word it jumps to that item
    function handleNameKeydown(event: KeyboardEvent) {
        // Only handle letter/number keys
        if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
            // Clear previous timeout
            if (nameSearchTimeout !== null) {
                clearTimeout(nameSearchTimeout);
            }

            // Add to search buffer
            nameSearchBuffer += event.key.toLowerCase();

            // Find matching name
            const match = availableNames.find(item =>
                item.name.toLowerCase().startsWith(nameSearchBuffer)
            );

            if (match) {
                // Scroll to the matching element
                const element = document.getElementById(`name-${match.displayKey}`);
                if (element) {
                    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            }

            // Clear buffer after 1 second of no typing
            nameSearchTimeout = window.setTimeout(() => {
                nameSearchBuffer = '';
            }, 1000);
        }
    }

    // Toggle individual name+specifier selection
    function toggleName(displayKey: string) {
        if (selectedNames.has(displayKey)) {
            selectedNames.delete(displayKey);
        } else {
            selectedNames.add(displayKey);
        }
        selectedNames = selectedNames; // Trigger reactivity
    }

    // Toggle select/deselect all names
    function toggleSelectAllNames() {
        if (selectedNames.size === availableNames.length) {
            // Currently all selected, so deselect all
            selectedNames = new Set();
        } else {
            // Not all selected, so select all
            selectedNames = new Set(availableNames.map(item => item.displayKey));
        }
    }

    // ============================================================================
    // FUNCTIONS: AGE FILTER
    // ============================================================================

    // Handle age filter changes
    function handleAgeChange(event: Event) {
        const target = event.target as HTMLSelectElement;
        selectedAge = target.value as 'any' | 'new' | 'old';
    }

    // ============================================================================
    // FUNCTIONS: RANDOM SEARCH TERM SELECTION
    // ============================================================================
    
    // Randomly select one search term from the active filtered list
    // Returns the pattern, specifier, and other relevant data
    function getRandomActiveSearchTerm(): { pattern: SearchPattern; specifier: string;} | null {
        if (activeSearchTerms.length === 0) {
            return null;
        }

        // Pick a random pattern from the active list
        const randomPattern = activeSearchTerms[Math.floor(Math.random() * activeSearchTerms.length)];

        // Filter the pattern's specifiers to only those that are selected
        const validSpecifiers = randomPattern.specifiers.filter((spec: string) => {
            const key = `${randomPattern.name}|||${spec}`;
            return selectedNames.has(key);
        });

        // Pick a random specifier from the valid ones
        const randomSpecifier = validSpecifiers.length > 0
            ? validSpecifiers[Math.floor(Math.random() * validSpecifiers.length)]
            : randomPattern.specifiers[0];

        // Return the entire object
        return {
            pattern: randomPattern,
            specifier: randomSpecifier,
        };
    }

    // ============================================================================
    // FUNCTIONS: RANDOM SPECIFIER DAY GENERATION
    // ============================================================================
    
    
    // Picks a random day if you dont override the date
    function randomSpecDay(pattern: SearchPattern): Date {
        const today = new Date();       
        let randomDays = 0;
        
        // Determine the range based on age filter
        if (selectedAge === 'any') {
            console.log('Selected age: any');
            if (pattern.age === 'old') {
                console.log('Random day selected for old pattern');
                randomDays = Math.floor(Math.random() * 3650); // Random day within the last 10 years
            } else if (pattern.age === 'new') {
                console.log('Random day selected for new pattern');
                randomDays = Math.floor(Math.random() * 365); // Random day within the last year
            }
        } else if (selectedAge === 'old') {
            console.log('Selected age: old');
            randomDays = Math.floor(Math.random() * 3650); // Random day within the last 10 years
        } else if (selectedAge === 'new') {
            console.log('Selected age: new');
            randomDays = Math.floor(Math.random() * 365); // Random day within the last year
        }

        // Respect any "date-before" or "date-after" tags
        if (pattern.dateBefore) {
            const constraintDate = new Date(pattern.dateBefore);
            const diffTime = Math.abs(today.getTime() - constraintDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            randomDays = Math.floor(Math.random() * diffDays);
            today.setDate(today.getDate() - randomDays);
            console.log('Date before constraint applied:', today);
            return today;
        } 
        else if (pattern.dateAfter) {
            const constraintDate = new Date(pattern.dateAfter);
            const diffTime = Math.abs(constraintDate.getTime() - today.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            randomDays = Math.floor(Math.random() * diffDays);
            today.setDate(constraintDate.getDate() + randomDays);
            console.log('Date after constraint applied:', today);
            return today;
        }
        else if (pattern.dateExact) {
            const exactDate = new Date(pattern.dateExact);
            console.log('Exact date constraint applied:', exactDate);
            return exactDate;
        }

        today.setDate(today.getDate() - randomDays);
        console.log('Random date selected:', today);
        return today;
    }

    // ============================================================================
    // FUNCTIONS: MAIN BUTTON HANDLER
    // ============================================================================

    // Handle "Find Videos" button click
    function handleFindVideos() {
        // Get a random search term from the active filtered list
        const result = getRandomActiveSearchTerm();

        if (!result) {
            console.warn('No active search terms available');
            alert('No search terms match your current filters. Please adjust your selections.');
            return;
        }

        // Pick a date: use override date if enabled, otherwise pick random date
        let formattedDate: Date;
        if (enableDateOverride && beforeDate) {
            formattedDate = new Date(beforeDate);
            console.log('Using override date:', formattedDate);
        } else {
            formattedDate = randomSpecDay(result.pattern);
            console.log('Using random date:', formattedDate);
        }

        console.log('Selected pattern:', result.pattern);
        console.log('Selected specifier:', result.specifier);
        console.log('Formatted date:', formattedDate);
        console.log('Active search terms count:', activeCount);

        // Format the search term into a YouTube URL
        const formattedURL = formatSearchTermToURL(result.pattern, result.specifier, formattedDate, enableDateOverride);

        console.log('Opening YouTube search:', formattedURL);

        // Open the search in a new tab
        window.open(formattedURL, '_blank');
    }

    // ============================================================================
    // LocalStorage Persistence (Custom User Search Terms)
    // ============================================================================

    // Load custom terms from localStorage and add to the active pool
    function loadCustomTermsIntoPool() {
        const customTerms = JSON.parse(localStorage.getItem('customSearchTerms') || '[]');

        // Remove any existing custom terms first (to avoid duplicates)
        allSearchTerms = allSearchTerms.filter(term => !term.isCustom);

        // Add custom terms to the main search terms list
        if (customTerms.length > 0) {
            allSearchTerms = [...allSearchTerms, ...customTerms];
        }
    }

    // Remove all custom terms from the active pool
    function removeCustomTermsFromPool() {
        allSearchTerms = allSearchTerms.filter(term => !term.isCustom);
    }

    // Converts Strings to a Search Term JSON Object
    function developSearchTerm(name: string, specifiers: string[], genre: string, age: string, constraint: [string, string]): SearchPattern {

        // Develop Search Term Object
        const searchTerm: SearchPattern = {
            name,
            genre,
            age,
            specifiers,
            constraint,
            isCustom: true // Mark all custom-created terms
        };

        return searchTerm;
    }

    // Save a custom search term to LocalStorage
    function saveSearchTerm() {
        if (!customName.trim()) {
            alert('Please enter a name for your search term');
            return;
        }

        // Filter out empty specifiers
        const specifiersArray = customSpecifiersList
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);

        if (specifiersArray.length === 0) {
            alert('Please enter at least one specifier');
            return;
        }

        // Build constraint array based on constraint type
        let constraint: [string, string] = ['', ''];
        if (customConstraintType !== 'none' && customConstraintDate) {
            constraint = [customConstraintType, customConstraintDate];
        }

        const searchTerm = developSearchTerm(
            customName,
            specifiersArray,
            customGenre || 'Custom', // Ensure genre defaults to "Custom"
            customAge,
            constraint
        );

        saveSearchTermToStorage(searchTerm);

        // If custom terms are enabled, reload the pool to include the new term
        if (enableUserTerms) {
            loadCustomTermsIntoPool();
        }

        // Clear form
        clearForm();

        alert('Search term saved!' + (enableUserTerms ? ' It has been added to your search pool.' : ' Enable custom terms to use it.'));
    }

    // Clear the form and reset to defaults
    function clearForm() {
        customName = '';
        customSpecifiersList = [''];
        customGenre = 'Custom';
        customAge = '';
        customConstraintType = 'none';
        customConstraintDate = '';
        selectedTermIndex = null;
    }

    // Add a new empty specifier field
    function addSpecifierField() {
        customSpecifiersList = [...customSpecifiersList, ''];
    }

    // Remove a specifier field at the given index
    function removeSpecifierField(index: number) {
        if (customSpecifiersList.length > 1) {
            customSpecifiersList = customSpecifiersList.filter((_, i) => i !== index);
        }
    }

    // Load a custom term from localStorage into the form
    function loadTermIntoForm(index: number) {
        const customTerms = JSON.parse(localStorage.getItem('customSearchTerms') || '[]');
        if (index >= 0 && index < customTerms.length) {
            const term = customTerms[index];
            customName = term.name || '';
            customSpecifiersList = term.specifiers.length > 0 ? [...term.specifiers] : [''];
            customGenre = term.genre || 'Custom';
            customAge = term.age || '';

            // Handle constraint
            if (term.constraint && term.constraint[0]) {
                customConstraintType = term.constraint[0];
                customConstraintDate = term.constraint[1] || '';
            } else {
                customConstraintType = 'none';
                customConstraintDate = '';
            }

            selectedTermIndex = index;
        }
    }

    function saveSearchTermToStorage(searchTerm: SearchPattern) {
        const existing = JSON.parse(localStorage.getItem('customSearchTerms') || '[]');
        existing.push(searchTerm);
        localStorage.setItem('customSearchTerms', JSON.stringify(existing));
    }

    // Reload custom terms from localStorage (manual refresh)
    function loadSearchTerms() {
        const customTerms = JSON.parse(localStorage.getItem('customSearchTerms') || '[]');
        if (customTerms.length === 0) {
            alert('No custom terms saved yet!');
            return;
        }

        // Reload custom terms into the pool
        loadCustomTermsIntoPool();

        alert(`Reloaded ${customTerms.length} custom search term(s)!`);
    }

    // ============================================================================
    // Import/Export Functions
    // ============================================================================

    // Export custom terms to JSON file
    function exportCustomTerms() {
        const customTerms = JSON.parse(localStorage.getItem('customSearchTerms') || '[]');

        if (customTerms.length === 0) {
            alert('No custom terms to export!');
            return;
        }

        // Generate timestamped filename
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const filename = `my-youtube-terms-${year}-${month}-${day}-${hours}${minutes}${seconds}.json`;

        // Create and download file
        const jsonString = JSON.stringify(customTerms, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert(`Exported ${customTerms.length} custom term(s) to ${filename}`);
    }

    // Validate that a search pattern has required fields
    function validateSearchPattern(term: any): boolean {
        // Must have at least name OR specifier
        const hasName = term.name && term.name.trim().length > 0;
        const hasSpecifiers = term.specifiers && Array.isArray(term.specifiers) &&
                             term.specifiers.some((s: string) => s && s.trim().length > 0);

        return hasName || hasSpecifiers;
    }

    // Simple import: Replace all existing terms
    function importSimple() {
        if (!selectedFile) {
            alert('Please select a file first');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const importedTerms = JSON.parse(content);

                if (!Array.isArray(importedTerms)) {
                    alert('Invalid file format: Expected an array of search terms');
                    return;
                }

                // Validate and filter terms
                let successCount = 0;
                let failedCount = 0;
                const validTerms: SearchPattern[] = [];

                importedTerms.forEach((term: any) => {
                    if (validateSearchPattern(term)) {
                        // Ensure isCustom flag is set
                        validTerms.push({ ...term, isCustom: true });
                        successCount++;
                    } else {
                        failedCount++;
                    }
                });

                // Replace all existing terms
                localStorage.setItem('customSearchTerms', JSON.stringify(validTerms));

                // Update stats and reload
                importStats = { success: successCount, failed: failedCount };
                if (enableUserTerms) {
                    loadCustomTermsIntoPool();
                }

                alert(`Import complete!\n✓ ${successCount} imported\n✗ ${failedCount} failed`);
            } catch (error) {
                alert('Error reading file: Invalid JSON format');
            }
        };
        reader.readAsText(selectedFile);
    }

    // Smart import: Merge duplicates (matching name AND age)
    function importMerge() {
        if (!selectedFile) {
            alert('Please select a file first');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const importedTerms = JSON.parse(content);

                if (!Array.isArray(importedTerms)) {
                    alert('Invalid file format: Expected an array of search terms');
                    return;
                }

                // Get existing terms
                const existing = JSON.parse(localStorage.getItem('customSearchTerms') || '[]');
                let successCount = 0;
                let failedCount = 0;

                importedTerms.forEach((importedTerm: any) => {
                    if (!validateSearchPattern(importedTerm)) {
                        failedCount++;
                        return;
                    }

                    // Find duplicate (matching name AND age)
                    const duplicateIndex = existing.findIndex((existingTerm: SearchPattern) =>
                        existingTerm.name === importedTerm.name &&
                        existingTerm.age === importedTerm.age
                    );

                    if (duplicateIndex >= 0) {
                        // Merge with existing term
                        const existingTerm = existing[duplicateIndex];

                        // Combine unique specifiers
                        const combinedSpecifiers = Array.from(new Set([
                            ...(existingTerm.specifiers || []),
                            ...(importedTerm.specifiers || [])
                        ]));

                        // Combine constraints
                        const existingConstraint = existingTerm.constraint || ['', ''];
                        const importedConstraint = importedTerm.constraint || ['', ''];
                        const combinedConstraint: [string, string] = [
                            importedConstraint[0] || existingConstraint[0],
                            importedConstraint[1] || existingConstraint[1]
                        ];

                        // Update existing term with merged data
                        existing[duplicateIndex] = {
                            name: existingTerm.name,
                            specifiers: combinedSpecifiers,
                            genre: importedTerm.genre || existingTerm.genre, // Keep genre from imported
                            age: existingTerm.age,
                            constraint: combinedConstraint,
                            isCustom: true
                        };
                    } else {
                        // Add as new term
                        existing.push({ ...importedTerm, isCustom: true });
                    }
                    successCount++;
                });

                // Save merged terms
                localStorage.setItem('customSearchTerms', JSON.stringify(existing));

                // Update stats and reload
                importStats = { success: successCount, failed: failedCount };
                if (enableUserTerms) {
                    loadCustomTermsIntoPool();
                }

                alert(`Import complete!\n✓ ${successCount} imported\n✗ ${failedCount} failed`);
            } catch (error) {
                alert('Error reading file: Invalid JSON format');
            }
        };
        reader.readAsText(selectedFile);
    }

    // Delete all custom terms with confirmation
    function deleteAllCustomTerms() {
        const customTerms = JSON.parse(localStorage.getItem('customSearchTerms') || '[]');

        if (customTerms.length === 0) {
            alert('No custom terms to delete');
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete all ${customTerms.length} custom term(s)?\n\nThis action cannot be undone.`);

        if (confirmed) {
            localStorage.removeItem('customSearchTerms');
            removeCustomTermsFromPool();
            importStats = null;
            selectedFile = null;
            alert('All custom terms have been deleted');
        }
    }

    // Handle file selection from input
    function handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            selectedFile = input.files[0];
            importStats = null; // Clear previous stats
        }
    }

    // Handle drag over event
    function handleDragOver(event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
        }
    }

    // Handle file drop
    function handleFileDrop(event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            selectedFile = event.dataTransfer.files[0];
            importStats = null; // Clear previous stats
        }
    }

    // ============================================================================
    // END OF SCRIPT
</script>

<style>
    @font-face {
        font-family: 'Arial';
        src: url('/fonts/arial.woff2') format('woff2'),
             url('/fonts/arial.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
    }

    @font-face {
        font-family: 'Arial Narrow';
        src: url('/fonts/arialnarrow.woff2') format('woff2'),
             url('/fonts/arialnarrow.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
    }

    :global(html) {
        height: 100%;
        overflow: hidden;
    }

    :global(body) {
        background-color: white;
        margin: 0;
        padding: 0;
        font-family: 'Arial', sans-serif;
        height: 100%;
        overflow: hidden;
    }

    /* CSS Variables for repeated values */
    :root {
        --border-std: 2px solid black;
        --border-thick: 3px solid black;
        --border-medium: 0.5rem solid black;
        --radius-sm: 0.25rem;
        --radius-md: 0.5rem;
        --transition-std: 0.2s ease;
        --color-primary: lightcyan;
        --color-bg: #f5f5f5;
        --color-danger: #FF6B6B;
        --color-success: #90EE90;
    }

    /* Shared hover effect for interactive elements */
    .rand-button:hover, .youtube-badge:hover, .header a:hover,
    .dropdown-button:hover, .custom-term-button:hover,
    .import-button:hover, .danger-button:hover, .file-select-button:hover {
        transform: scale(1.01);
    }

    .header-base {
        height: 5rem;
        border: 0.5rem solid black;
        border-bottom: 0;
        align-items: center;
        display: flex;
        padding: 0 1rem;
        flex-shrink: 0;
    }
    
    .header {
        background-color: lightcoral;        
        justify-content: space-between;

    }

    .header a {
    color: inherit;
    text-decoration: none;
    font-size: inherit;
    font-weight: inherit;
    font-family: inherit;
    transition: transform var(--transition-std);
    display: inline-block;
    }
    
    .header-2 {
        background-color: lightblue;
        justify-content: center;
    }

    .youtube-badge {
        background-color: red;
        color: white;
        padding: 0.5rem 1rem;
        font-weight: bold;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
        transition: transform var(--transition-std);
        border: none;
        flex-shrink: 0;
    }
        
    .youtube-badge img {
        height: 2.5rem;
        width: 2.5rem;
        border-radius: 50%;
        object-fit: cover;
    }

    .youtube-badge h1 {
        margin: 0rem;
        padding: 0rem;
        font-size: 1.5rem;
        font-family: Arial Narrow, sans-serif;
    }
    
    .content-body {
        background-color: #f5f5f5;
        border: 0.5rem solid black;
        flex: 1;
        overflow-y: auto;
        box-sizing: border-box;
    }

    .page-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        box-sizing: border-box;
    }
    
    .grid-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        max-width: 100%;
        margin: 0 auto;
        padding-bottom: 1.5rem;
        background-color: #f5f5f5;
    }

    .grid-item {
        padding: 1.5rem 1.5rem 0 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .top-buttons {
        display: flex;
        gap: 1rem;
        justify-content: space-evenly;
    }

    .rand-button {
        padding: 0.75rem 2rem;
        font-size: 1rem;
        background-color: lightgoldenrodyellow;
        color: black;
        border: var(--border-std);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-weight: bold;
        transition: transform var(--transition-std);
        width: 25%;
    }

    .filter-container {
        display: flex;
        flex-direction: row;
        gap: 0.75rem;
        padding: 0 2rem;
        justify-content: center;
        align-items: center;
    }

    .filter-container span {
        font-size: 1rem;
        font-weight: 500;
    }

    .filter-select {
        padding: 0.5rem 1rem;
        font-size: 1rem;
        background-color: var(--color-bg);
        color: black;
        border: var(--border-std);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-weight: bold;
    }

    .checkbox-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .checkbox-item input[type="checkbox"] {
        width: 1.5rem;
        height: 1.5rem;
        cursor: pointer;
    }

    .checkbox-item label {
        font-size: 1.25rem;
        font-weight: 500;
        cursor: pointer;
    }

    .checkbox-item label h4 {
        font-size: 1.25rem;
        margin: 0;
    }

    .filter-select:disabled {
        background-color: #e0e0e0;
        cursor: not-allowed;
        opacity: 0.6;
    }

    .genre-selector {
        position: relative;
        width: 100%;
        max-width: 400px;
    }

    .dropdown-button {
        width: 100%;
        padding: 0.75rem 1rem;
        font-size: 1rem;
        background-color: var(--color-primary);
        color: black;
        border: var(--border-std);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-weight: bold;
        display: flex; 
        justify-content: space-between;
        align-items: center;
        transition: transform var(--transition-std);
    }

    .dropdown-arrow {
        font-size: 0.8rem;
    }

    .genre-dropdown-menu {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 0.5rem;
        background-color: white;
        border: var(--border-std);
        border-radius: var(--radius-md);
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .genre-checkbox-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        cursor: pointer;
        transition: background-color var(--transition-std);
    }

    .genre-checkbox-item:hover {
        background-color: #f0f0f0;
    }

    .genre-checkbox-item.select-all {
        font-weight: bold;
        background-color: var(--color-bg);
    }

    .genre-checkbox-item input[type="checkbox"] {
        width: 1.25rem;
        height: 1.25rem;
        cursor: pointer;
    }

    .genre-checkbox-item span {
        font-size: 1rem;
        user-select: none;
    }

    .genre-divider {
        height: 2px;
        background-color: #e0e0e0;
        margin: 0.25rem 0;
    }

    /* Shared container styles for custom-terms-creator and import-export-container */
    .custom-terms-creator, .import-export-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        padding: 2rem;
        background-color: #fff;
        border: var(--border-thick);
        border-radius: var(--radius-md);
        margin: 1.5rem 2rem;
        max-width: 800px;
        margin-left: auto;
        margin-right: auto;
    }

    .custom-terms-creator h3, .import-export-container h3 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: bold;
    }

    .form-section {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .form-row {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
    }

    .form-row label {
        font-weight: bold;
        font-size: 1rem;
    }

    .form-row input,
    .form-row select {
        padding: 0.75rem;
        font-size: 1rem;
        border: var(--border-std);
        border-radius: var(--radius-sm);
        font-family: 'Arial', sans-serif;
    }

    .form-row input:focus,
    .form-row select:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(32, 178, 170, 0.2);
    }

    .form-row.optional label {
        color: #666;
    }

    .form-row.optional input,
    .form-row.optional select {
        background-color: #f9f9f9;
        border-color: #ccc;
    }

    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        width: 100%;
    }

    .custom-term-button {
        padding: 0.75rem 2rem;
        font-size: 1rem;
        background-color: var(--color-primary);
        color: black;
        border: var(--border-std);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-weight: bold;
        transition: transform var(--transition-std);
    }

    .custom-term-button h2 {
        margin: 0;
        font-size: 1rem;
    }


    .form-top-row {
        display: flex;
        gap: 1rem;
        width: 100%;
        align-items: center;
    }

    .term-selector {
        flex: 1;
    }

    .term-selector select {
        width: 100%;
        padding: 0.75rem;
        font-size: 1rem;
        border: var(--border-std);
        border-radius: var(--radius-sm);
        background-color: var(--color-primary);
        color: black;
        font-weight: bold;
        cursor: pointer;
        font-family: 'Arial', sans-serif;
    }

    .specifier-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
    }

    .specifier-inputs {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .specifier-control-bar {
        display: flex;
        flex-direction: column;
        width: 3rem;
        border: var(--border-std);
        border-radius: var(--radius-sm);
        overflow: hidden;
        align-self: stretch;
    }

    /* Shared specifier button styles */
    .specifier-add-btn, .specifier-remove-btn {
        flex: 1;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        font-weight: bold;
        color: #000;
        transition: background-color var(--transition-std);
    }

    .specifier-add-btn {
        background-color: var(--color-success);
        border-bottom: 1px solid black;
    }

    .specifier-add-btn:hover {
        background-color: #7CFC00;
    }

    .specifier-remove-btn {
        background-color: var(--color-danger);
    }

    .specifier-remove-btn:hover {
        background-color: #FF4444;
    }

    .specifier-remove-btn:disabled {
        background-color: #CCCCCC;
        cursor: not-allowed;
        opacity: 0.5;
    }

    .more-info-toggle {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    .more-info-toggle input[type="checkbox"] {
        width: 1.25rem;
        height: 1.25rem;
        cursor: pointer;
    }

    .more-info-toggle label {
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        color: #666;
    }

    /* Import/Export specific styles (container shared above with custom-terms-creator) */
    .file-section-label {
        font-weight: bold;
        font-size: 1rem;
        margin-bottom: 0.5rem;
        display: block;
    }

    .file-drop-zone {
        width: 100%;
        min-height: 150px;
        border: 3px dashed #999;
        border-radius: var(--radius-md);
        background-color: #f9f9f9;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all var(--transition-std);
    }

    .file-drop-zone:hover, .file-drop-zone.active {
        border-color: var(--color-primary);
    }

    .file-drop-zone:hover {
        background-color: #f0ffff;
    }

    .file-drop-zone.active {
        background-color: #e0ffff;
    }

    .drop-zone-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        text-align: center;
    }

    .drop-zone-text, .drop-zone-subtext {
        margin: 0;
    }

    .drop-zone-text {
        font-size: 1rem;
        color: #333;
    }

    .drop-zone-subtext {
        font-size: 0.9rem;
        color: #666;
    }

    .file-select-button {
        padding: 0.5rem 1.5rem;
        background-color: var(--color-primary);
        color: black;
        border: var(--border-std);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-weight: bold;
        transition: transform var(--transition-std);
    }

    .import-button-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        width: 100%;
    }

    .import-button {
        padding: 1rem;
        background-color: var(--color-success);
        color: black;
        border: var(--border-std);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-weight: bold;
        transition: transform var(--transition-std);
        text-align: center;
    }

    .import-button h2, .danger-button h2 {
        margin: 0;
        font-size: 1rem;
    }

    .import-button h2 {
        margin-bottom: 0.5rem;
    }

    .import-button p {
        margin: 0;
        font-size: 0.85rem;
        font-weight: normal;
        color: #333;
    }

    .danger-button {
        width: 100%;
        padding: 0.75rem 2rem;
        font-size: 1rem;
        background-color: var(--color-danger);
        color: black;
        border: var(--border-std);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-weight: bold;
        transition: all var(--transition-std);
    }

    .import-stats {
        width: 100%;
        padding: 1rem;
        background-color: #e8f5e9;
        border: 2px solid #4caf50;
        border-radius: var(--radius-md);
        text-align: center;
    }

    .import-stats p {
        margin: 0;
        font-size: 1rem;
        color: #333;
    }

    /* Tablet/Medium Responsive Styles */
    @media (max-width: 960px) and (min-width: 769px) {
        .header-base {
            height: 4rem;
            border-width: 0.375rem;
            padding: 0.75rem;
        }

        .header h4 {
            font-size: 0.75rem;
        }

        .header h1 {
            font-size: 2rem;
        }

        .youtube-badge {
            padding: 0.4rem 0.75rem;
            gap: 0.5rem;
        }

        .youtube-badge img {
            height: 2rem;
            width: 2rem;
        }

        .youtube-badge h1 {
            font-size: 1.1rem;
        }

        .header-2 h1 {
            font-size: 1.5rem;
        }

        .content-body {
            border-width: 0.375rem;
        }

        .grid-container {
            grid-template-columns: 1fr;
            gap: 1rem;
            padding: 1rem;
            display: block;
        }

        .grid-item {
            padding: 1.25rem;
        }

        .rand-button {
            width: 100%;
            max-width: 400px;
            margin: 0 auto;
            padding: 0.65rem 1.5rem;
            font-size: 0.95rem;
        }

        .filter-container {
            padding: 0 1rem;
            gap: 0.65rem;
        }

        .filter-select {
            padding: 0.45rem 0.75rem;
            font-size: 0.9rem;
        }

        .genre-selector {
            max-width: 100%;
        }

        .dropdown-button {
            padding: 0.65rem 0.9rem;
            font-size: 0.9rem;
        }
    }

    /* Mobile Responsive Styles */
    @media (max-width: 768px) {

        /* Hide the entire custom terms section on mobile */
        .grid-container:has(.checkbox-item input#enable-user-terms) {
            display: none !important;
        }

        /* Also hide the custom terms creator form */
        .custom-terms-creator {
            display: none !important;
        }

        /* Also hide the import/export form */
        .import-export-container {
            display: none !important;
        }

        /* Scale down header */
        .header-base {
            height: auto;
            min-height: auto;
            border-width: 0.25rem;
            padding: 0.5rem;
            flex-direction: column;
            gap: 0.25rem;
        }

        .header h4 {
            font-size: 0.5rem;
            margin: 0;
            text-align: center;
        }

        .header h1 {
            font-size: 0.7rem;
            margin: 0;
            text-align: center;
        }

        .youtube-badge {
            padding: 0.2rem 0.4rem;
            gap: 0.3rem;
        }

        .youtube-badge img {
            height: 1.2rem;
            width: 1.2rem;
        }

        .youtube-badge h1 {
            font-size: 0.6rem;
        }

        .header-2 h1 {
            font-size: 0.65rem;
            margin: 0.3rem;
            text-align: center;
            line-height: 1.2;
        }

        /* Scale down content */
        .content-body {
            border-width: 0.25rem;
            min-height: auto;
        }

        .grid-container {
            grid-template-columns: 1fr;
            gap: 1rem;
            padding: 1rem;
            display: flex;
            align-content: center;
        }

        .grid-item {
            padding: 1rem;
            gap: 0.5rem;
        }

        /* Scale down buttons */
        .top-buttons {
            flex-direction: column;
            gap: 0.5rem;
        }

        .rand-button {
            width: 100%;
            padding: 0.4rem 0.8rem;
            font-size: 0.7rem;
        }

        .rand-button h2 {
            font-size: 0.8rem;
            margin: 0;
        }

        /* Scale down filter container */
        .filter-container {
            flex-direction: column;
            padding: 0 0.5rem;
            gap: 0.4rem;
        }

        /* Wrap the date filter on a new line */
        .filter-container {
            flex-wrap: wrap;
        }

        .filter-container h2 {
            font-size: 0.75rem;
            margin: 0;
        }

        .filter-select {
            padding: 0.4rem;
            font-size: 0.7rem;
            width: 100%;
            max-width: 200px;
        }

        /* Make date input appear on its own line on mobile */
        .filter-container input[type="date"] {
            width: 100%;
            max-width: 200px;
        }

        .checkbox-item input[type="checkbox"] {
            width: 1rem;
            height: 1rem;
        }

        .checkbox-item label h4 {
            font-size: 0.75rem;
        }


        /* Scale down dropdowns */
        .genre-selector {
            max-width: 100%;
        }

        .dropdown-button {
            padding: 0.4rem 0.6rem;
            font-size: 0.7rem;
        }

        .genre-dropdown-menu {
            max-height: 200px;
        }

        .genre-checkbox-item {
            padding: 0.4rem 0.6rem;
            gap: 0.4rem;
        }

        .genre-checkbox-item input[type="checkbox"] {
            width: 0.85rem;
            height: 0.85rem;
        }

        .genre-checkbox-item span {
            font-size: 0.7rem;
        }

        /* Scale down custom terms creator */
        .custom-terms-creator {
            margin: 1rem;
            padding: 1rem;
            gap: 1rem;
        }

        .custom-terms-creator h3 {
            font-size: 1rem;
        }

        .form-section {
            gap: 0.75rem;
        }

        .form-row {
            gap: 0.4rem;
        }

        .form-row label {
            font-size: 0.75rem;
        }

        .form-row input,
        .form-row select {
            padding: 0.5rem;
            font-size: 0.75rem;
        }

        .form-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
        }

        .custom-term-button {
            padding: 0.5rem 1rem;
            font-size: 0.75rem;
        }

        .custom-term-button h2 {
            font-size: 0.75rem;
        }
    }

    /* Extra small mobile devices */
    @media (max-width: 480px) {
        .header h4 {
            font-size: 0.45rem;
        }

        .header h1 {
            font-size: 0.6rem;
        }

        .youtube-badge {
            padding: 0.15rem 0.3rem;
        }

        .youtube-badge img {
            height: 1rem;
            width: 1rem;
        }

        .youtube-badge h1 {
            font-size: 0.5rem;
        }

        .header-2 h1 {
            font-size: 0.55rem;
            line-height: 1.2;
        }

        .filter-container h2,
        .rand-button h2 {
            font-size: 0.7rem;
        }



        .dropdown-button,
        .genre-checkbox-item span {
            font-size: 0.65rem;
        }
    }

</style>

<div class="page-container">

    <!-- First Header -->
    <header class="header-base header">
        <h4><a href="https://x.com/MingKasterMK/status/1965144635388653811/photo/1" target="_blank">Mapped by KVN AUST & Mika_Virus</a></h4>
        <h1>Youtube's Recycle Bin | Randomizer</h1>
        <button class="youtube-badge" on:click={() => window.open('https://www.youtube.com/KVNAUST', '_blank')}>
            <img src="{base}/kvnaust.jpg" alt="KVN AUST"/>
            <h1>YouTube.com/KVNAUST</h1>
        </button>
    </header>

    <!-- Second Header -->
    <header class="header-base header-2">
        <h1>Find New, Old, and Forgotten Youtube Videos</h1>
    </header>

    <!-- Main Content -->
    <main class="content-body">

        <!-- First Row (Random Video Button)-->
        <div class="grid-container">

            <div class="grid-item">
                <div class="top-buttons">
                    <button class="rand-button" on:click={handleFindVideos}><h2>Find Random Videos!</h2></button>
                </div>

            </div>

        </div>

        <!-- Second Row (Age Filter Options)-->
        <div class="grid-container">
            <div class="grid-item">
                <div class="filter-container" style="align-items: center;">
                    <span><h2>Show me</h2></span>
                    <select class="filter-select" on:change={handleAgeChange}>
                        <option value="any" selected>Any</option>
                        <option value="old">Old</option>
                        <option value="new">New</option>
                    </select>
                    <span><h2>Videos</h2></span>
                    {#if enableDateOverride}
                        <span><h2>Before:</h2></span>
                        <input
                            type="date"
                            class="filter-select"
                            bind:value={beforeDate}
                        />
                    {/if}
                </div>
            </div>
        </div>

        <!-- Third Row (Advanced Settings Checkbox) -->
        <div class="grid-container">

            <!-- Advanced Settings Checkbox -->
            <div class="grid-item">
                <div class="checkbox-item">
                    <input
                        type="checkbox"
                        id="advanced-settings"
                        bind:checked={showAdvancedSettings}
                    />
                    <label for="advanced-settings"><h4>Advanced Settings</h4></label>
                </div>
            </div>
 
        </div>

        <!-- Fourth Row (Advanced Settings)-->
        {#if showAdvancedSettings}
        <div class="grid-container" style="padding-top: 1rem;">

            <!-- Checkbox Items -->
            <div class="grid-item">
                {#if showAdvancedSettings}
                <div class="checkbox-item">
                    <input
                        type="checkbox"
                        id="enable-date-override"
                        bind:checked={enableDateOverride}
                    />
                    <label for="enable-date-override"><h4>Use custom date</h4></label>
                </div>
                {/if}
            </div>

            <!-- Genre Selector -->
            <div class="grid-item">
                {#if showAdvancedSettings}
                <div class="genre-selector">
                    <button
                        class="dropdown-button"
                        on:click={() => genreDropdownOpen = !genreDropdownOpen}
                    >
                        Genres: ({selectedGenres.size}/{allGenres.length})
                        <span class="dropdown-arrow">{genreDropdownOpen ? '▲' : '▼'}</span>
                    </button>

                    {#if genreDropdownOpen}
                        <div
                            bind:this={genreDropdownElement}
                            class="genre-dropdown-menu"
                            role="listbox"
                            tabindex="0"
                            on:keydown={handleGenreKeydown}
                        >
                            <!-- Select All checkbox -->
                            <label class="genre-checkbox-item select-all">
                                <input
                                    type="checkbox"
                                    bind:checked={selectAllGenres}
                                    on:click={toggleSelectAll}
                                />
                                <span>Select All</span>
                            </label>

                            <div class="genre-divider"></div>

                            <!-- Individual genre checkboxes -->
                            {#each allGenres as genre}
                                <label
                                    class="genre-checkbox-item"
                                    id="genre-{genre}"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedGenres.has(genre)}
                                        on:change={() => toggleGenre(genre)}
                                    />
                                    <span>{genre}</span>
                                </label>
                            {/each}
                        </div>
                    {/if}
                </div>
                {/if}
            </div>

            <!-- Name/Search Term Selector -->
            <div class="grid-item">
                {#if showAdvancedSettings}
                <div class="genre-selector">
                    <button
                        class="dropdown-button"
                        on:click={() => nameDropdownOpen = !nameDropdownOpen}
                    >
                        Search Terms: ({selectedNames.size}/{availableNames.length})
                        <span class="dropdown-arrow">{nameDropdownOpen ? '▲' : '▼'}</span>
                    </button>

                    {#if nameDropdownOpen}
                        <div
                            bind:this={nameDropdownElement}
                            class="genre-dropdown-menu"
                            role="listbox"
                            tabindex="0"
                            on:keydown={handleNameKeydown}
                        >
                            <!-- Select All checkbox (on deselect, uncheck everything)-->
                            <label class="genre-checkbox-item select-all">
                                <input
                                    type="checkbox"
                                    bind:checked={selectAllNames}
                                    on:click={toggleSelectAllNames}
                                />
                                <span>Select All</span>
                            </label>

                            <div class="genre-divider"></div>

                            <!-- Individual name+specifier checkboxes -->
                            {#each availableNames as item}
                                <label
                                    class="genre-checkbox-item"
                                    id="name-{item.displayKey}"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedNames.has(item.displayKey)}
                                        on:change={() => toggleName(item.displayKey)}
                                    />
                                    <span>
                                        {item.name === '' ? '' : item.name}
                                        {#if item.specifier && item.showSpecifier}
                                            <span style="color: #aaa; margin-left: 4px;">{item.specifier}</span>
                                        {/if}
                                    </span>
                                </label>
                            {/each}
                        </div>
                    {/if}
                </div>
                {/if}
            </div>

        </div>
        {/if}

        <!-- Fifth Row (Custom Terms) -->
        {#if showAdvancedSettings}
        <div class="grid-container">
            <div class="grid-item">
                <div class ="checkbox-item">
                        <input
                            type="checkbox"
                            id="enable-user-terms"
                            bind:checked={enableUserTerms}
                        />
                        <label for="enable-user-terms"><h4>Enable custom terms</h4></label>
                    </div>
            </div>

            {#if enableUserTerms}
            <div class="grid-item">
                <div class ="checkbox-item">
                        <input
                            type="checkbox"
                            id="edit-user-terms"
                            bind:checked={editCustomTerms}
                        />
                        <label for="edit-user-terms"><h4>Edit custom terms</h4></label>
                    </div>
            </div>

            <div class="grid-item">
                <div class ="checkbox-item">
                        <input
                            type="checkbox"
                            id="manage-terms"
                            bind:checked={manageCustomTerms}
                        />
                        <label for="manage-terms"><h4>Import/Export terms</h4></label>
                    </div>
            </div>

            {/if}

        </div>
        {/if}

        
        <!-- Sixth Row (Custom User Terms) -->
         {#if showAdvancedSettings && editCustomTerms}
        <div class="custom-terms-creator">
            <h3>Create/Edit Search Terms</h3>

            <!-- Top Row: Save Button + Term Selector -->
            <div class="form-top-row">
                <button class="custom-term-button" on:click={saveSearchTerm}>
                    <h2>Save Custom Term</h2>
                </button>

                <!-- Form Dropdown Menu -->
                <div class="term-selector">
                    <select on:change={(e) => {
                        const index = parseInt(e.currentTarget.value);
                        if (!isNaN(index) && index >= 0) {
                            loadTermIntoForm(index);
                        }
                    }}>
                        <option value="-1">
                            {JSON.parse(localStorage.getItem('customSearchTerms') || '[]').length === 0
                                ? 'No saved terms'
                                : 'Select a saved term...'}
                        </option>
                        {#each JSON.parse(localStorage.getItem('customSearchTerms') || '[]') as term, i}
                            <option value={i}>
                                {term.name} {term.specifiers.length > 0 ? `${term.specifiers[0]}` : ''}
                            </option>
                        {/each}
                    </select>
                </div>
            </div>

            <!-- Required Fields Section -->
            <div class="form-section">
                <div class="form-row">
                    <label for="custom-name">Search Term: (Space Sensitive)</label>
                    <input
                        type="text"
                        id="custom-name"
                        placeholder="i.e: IMG, MOV , My Epic Video, etc..."
                        bind:value={customName}
                    />
                </div>

                <div class="form-row">
                    <label for="custom-specifiers">Specifiers:</label>
                    <div class="specifier-container">
                        <div class="specifier-inputs">
                            {#each customSpecifiersList as _, i}
                                <input
                                    type="text"
                                    placeholder="i.e: XXXX, Month DD YYYY, YYYY/MM/DD, etc..."
                                    bind:value={customSpecifiersList[i]}
                                />
                            {/each}
                        </div>
                        <div class="specifier-control-bar">
                            <button
                                class="specifier-add-btn"
                                on:click={addSpecifierField}
                                type="button"
                                title="Add specifier field"
                            >
                                +
                            </button>
                            <button
                                class="specifier-remove-btn"
                                on:click={() => removeSpecifierField(customSpecifiersList.length - 1)}
                                type="button"
                                disabled={customSpecifiersList.length <= 1}
                                title="Remove last specifier field"
                            >
                                −
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- More Info Toggle -->
            <div class="more-info-toggle">
                <input
                    type="checkbox"
                    id="show-more-info"
                    bind:checked={showMoreInfo}
                />
                <label for="show-more-info">More info?</label>
            </div>

            {#if showMoreInfo}
            <!-- Optional Fields Section -->
            <div class="form-section">
                <div class="form-grid">
                    <div class="form-row optional">
                        <label for="custom-genre">Genre:</label>
                        <input
                            type="text"
                            id="custom-genre"
                            placeholder="Custom (default)"
                            bind:value={customGenre}
                        />
                    </div>

                    <div class="form-row optional">
                        <label for="custom-age">Age Filter:</label>
                        <select id="custom-age" bind:value={customAge}>
                            <option value="">Any (default)</option>
                            <option value="new">New</option>
                            <option value="old">Old</option>
                        </select>
                    </div>
                </div>

                <div class="form-grid">
                    <div class="form-row optional">
                        <label for="custom-constraint">Date Constraint:</label>
                        <select id="custom-constraint" bind:value={customConstraintType}>
                            <option value="none">None (default)</option>
                            <option value="before">Before</option>
                            <option value="after">After</option>
                            <option value="exact">Exact</option>
                        </select>
                    </div>

                    {#if customConstraintType !== 'none'}
                    <div class="form-row optional">
                        <label for="custom-constraint-date">Constraint Date:</label>
                        <input
                            type="date"
                            id="custom-constraint-date"
                            bind:value={customConstraintDate}
                        />
                    </div>
                    {/if}
                </div>
            </div>
            {/if}
        </div>
        {/if}

        <!-- Seventh Row (Import/Export Manager) -->
        {#if showAdvancedSettings && enableUserTerms && manageCustomTerms}
        <div class="import-export-container">
            <h3>Import/Export Custom Terms</h3>

            <!-- Export Section -->
            <div class="form-section">
                <button class="custom-term-button" on:click={exportCustomTerms}>
                    <h2>Export to File</h2>
                </button>
            </div>

            <!-- File Selection Section -->
            <div class="form-section">


                <!-- Drag & Drop Zone -->
                <div
                    class="file-drop-zone"
                    class:active={false}
                    on:dragover={handleDragOver}
                    on:drop={handleFileDrop}
                    role="button"
                    tabindex="0"
                >
                    <div class="drop-zone-content">
                        <p class="drop-zone-text">
                            {#if selectedFile}
                                ✓ Selected: <strong>{selectedFile.name}</strong>
                            {:else}
                                Drag & drop a JSON file here
                            {/if}
                        </p>
                        <p class="drop-zone-subtext">or</p>
                        <label class="file-select-button">
                            Choose File
                            <input
                                type="file"
                                accept=".json"
                                on:change={handleFileSelect}
                                style="display: none;"
                            />
                        </label>
                    </div>
                </div>
            </div>

            <!-- Import Options -->
            <div class="form-section">
                <div class="import-button-grid">
                    <button class="import-button" on:click={importSimple}>
                        <h2>Replace All</h2>
                        <p>Overwrites existing terms</p>
                    </button>

                    <button class="import-button" on:click={importMerge}>
                        <h2>Merge Duplicates</h2>
                        <p>Combines matching terms</p>
                    </button>
                </div>
            </div>

            <!-- Delete Section -->
            <div class="form-section">
                <button class="danger-button" on:click={deleteAllCustomTerms}>
                    <h2>Clear All Custom Terms</h2>
                </button>
            </div>

            <!-- Import Results Display -->
            {#if importStats}
            <div class="import-stats">
                <p>
                    ✓ <strong>{importStats.success}</strong> imported
                    {#if importStats.failed > 0}
                        · ✗ <strong>{importStats.failed}</strong> failed
                    {/if}
                </p>
            </div>
            {/if}
        </div>
        {/if}

    </main>
</div>

