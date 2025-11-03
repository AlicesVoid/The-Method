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

    // TODO: Create an "active flags" array/map to track which items are currently active
    // This will be used to filter which search terms can be randomly selected
    // Flags should be based on: genre filters, name filters, age filters, date constraints
    let activeFlags: boolean[] = []; // TODO: One flag per search term

    // ============================================================================
    // DERIVED LISTS FOR UI DROPDOWNS
    // ============================================================================
    // Extract unique genres and names from the loaded search terms
    // These will populate the filter dropdowns in the UI

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
    // This updates reactively based on which genres are selected
    interface NameSpecifierItem {
        name: string;
        specifier: string;
        displayKey: string; // Unique key for this combination
        showSpecifier: boolean; // Only show specifier if multiple items share the same name
    }

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

    // ============================================================================
    // STATE: AGE FILTER
    // ============================================================================
    let selectedAge: 'any' | 'new' | 'old' = 'any';

    // ============================================================================
    // STATE: GENRE SELECTION
    // ============================================================================
    // Initialize with all genres selected except NSFW

    let selectedGenres: Set<string> = new Set();
    let selectAllGenres: boolean = false;
    let genreDropdownOpen: boolean = false;
    let genresInitialized: boolean = false;

    // Initialize selectedGenres after allGenres is computed (only once)
    $: if (allGenres.length > 0 && !genresInitialized) {
        selectedGenres = new Set(allGenres.filter(genre => genre !== 'NSFW'));
        genresInitialized = true;
    }

    // Sync selectAllGenres checkbox with actual selection state
    $: selectAllGenres = allGenres.length > 0 && selectedGenres.size === allGenres.length;

    // Unselect all genres if "Select All" is unchecked
    // $: if (!selectAllGenres && selectedGenres.size === allGenres.length) {
    //     selectedGenres = new Set();
    // }
    
    // ============================================================================
    // STATE: NAME/SEARCH TERM SELECTION
    // ============================================================================
    // Stores the displayKey (name|||specifier) for each selected name+specifier combination
    // This will update the active flags for filtering the search term list

    let selectedNames: Set<string> = new Set();
    let selectAllNames: boolean = true;
    let nameDropdownOpen: boolean = false;
    let namesInitialized: boolean = false;

    // Initialize selectedNames to all available names after they're computed (only once)
    $: if (availableNames.length > 0 && !namesInitialized) {
        selectedNames = new Set(availableNames.map(item => item.displayKey));
        namesInitialized = true;
    }

    // Sync selectAllNames checkbox with actual selection state
    $: selectAllNames = availableNames.length > 0 && selectedNames.size === availableNames.length;

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

    function toggleGenre(genre: string) {
        if (selectedGenres.has(genre)) {
            selectedGenres.delete(genre);
        } else {
            selectedGenres.add(genre);
        }
        selectedGenres = selectedGenres; // Trigger reactivity
    }

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

    function toggleName(displayKey: string) {
        if (selectedNames.has(displayKey)) {
            selectedNames.delete(displayKey);
        } else {
            selectedNames.add(displayKey);
        }
        selectedNames = selectedNames; // Trigger reactivity
    }

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

    function handleFindVideos() {
        // Get a random search term from the active filtered list
        const result = getRandomActiveSearchTerm();

        if (!result) {
            console.warn('No active search terms available');
            alert('No search terms match your current filters. Please adjust your selections.');
            return;
        }

        // Pick a random date based on the pattern using randomSpecDay()
        const formattedDate = randomSpecDay(result.pattern);

        console.log('Selected pattern:', result.pattern);
        console.log('Selected specifier:', result.specifier);
        console.log('Formatted date:', formattedDate);
        console.log('Active search terms count:', activeCount);

        // Format the search term into a YouTube URL
        const formattedURL = formatSearchTermToURL(result.pattern, result.specifier, formattedDate);

        console.log('Opening YouTube search:', formattedURL);

        // Open the search in a new tab
        window.open(formattedURL, '_blank');
    }
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
    transition: transform 0.2s ease;
    display: inline-block;
    }

    .header a:hover {
    text-decoration: none;
    transform: scale(1.05);
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
        border-radius: 0.25rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
        transition: transform 0.2s ease;
        border: none;
        flex-shrink: 0;
    }

    .youtube-badge:hover {
        transform: scale(1.05);
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
        background-color: #f5f5f5;
    }

    .grid-item {
        padding: 1.5rem;
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
        border: 2px solid black;
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: bold;
        transition: transform 0.2s ease;
        width: 25%;
    }

    .rand-button:hover {
        transform: scale(1.05);
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
        background-color: #f5f5f5;
        color: black;
        border: 2px solid black;
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: bold;
    }

    .advanced-settings-checkbox {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        justify-content: center;
    }

    .advanced-settings-checkbox input[type="checkbox"] {
        width: 1.5rem;
        height: 1.5rem;
        cursor: pointer;
    }

    .advanced-settings-checkbox label {
        font-size: 1.25rem;
        font-weight: 500;
        cursor: pointer;
    }

    .date-picker-container {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        align-items: center;
    }

    .date-checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .date-checkbox input[type="checkbox"] {
        width: 1.25rem;
        height: 1.25rem;
        cursor: pointer;
    }

    .date-checkbox label {
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
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
        margin: 0 auto;
    }

    .genre-dropdown-button {
        width: 100%;
        padding: 0.75rem 1rem;
        font-size: 1rem;
        background-color: lightseagreen;
        color: black;
        border: 2px solid black;
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: transform 0.2s ease;
    }

    .genre-dropdown-button:hover {
        transform: scale(1.02);
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
        border: 2px solid black;
        border-radius: 0.5rem;
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
        transition: background-color 0.2s ease;
    }

    .genre-checkbox-item:hover {
        background-color: #f0f0f0;
    }

    .genre-checkbox-item.select-all {
        font-weight: bold;
        background-color: #f5f5f5;
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

    /* Tablet/Medium Responsive Styles */
    @media (max-width: 1280px) and (min-width: 769px) {
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
            gap: 1.25rem;
            padding: 1rem;
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

        .genre-dropdown-button {
            padding: 0.65rem 0.9rem;
            font-size: 0.9rem;
        }
    }

    /* Mobile Responsive Styles */
    @media (max-width: 768px) {
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
            padding: 0.5rem;
        }

        .grid-item {
            padding: 0.75rem;
            gap: 0.75rem;
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

        /* Scale down checkboxes and labels */
        .advanced-settings-checkbox {
            gap: 0.4rem;
        }

        .advanced-settings-checkbox input[type="checkbox"] {
            width: 1rem;
            height: 1rem;
        }

        .advanced-settings-checkbox label h4 {
            font-size: 0.75rem;
            margin: 0;
        }

        .date-checkbox input[type="checkbox"] {
            width: 0.9rem;
            height: 0.9rem;
        }

        .date-checkbox label h4 {
            font-size: 0.7rem;
            margin: 0;
        }

        /* Scale down dropdowns */
        .genre-selector {
            max-width: 100%;
        }

        .genre-dropdown-button {
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

        .advanced-settings-checkbox label h4,
        .date-checkbox label h4 {
            font-size: 0.65rem;
        }

        .genre-dropdown-button,
        .genre-checkbox-item span {
            font-size: 0.65rem;
        }
    }

</style>

<!-- Head Section -->
<svelte:head>
    <title>Youtube's Recycle Bin</title>
</svelte:head>


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

        <!-- Third Row (Advanced Settings) -->
        <div class="grid-container" style="align-items: center;">
            
            <!-- Advanced Settings Checkbox -->
            <div class="grid-item">
                <div class="advanced-settings-checkbox">
                    <input
                        type="checkbox"
                        id="advanced-settings"
                        bind:checked={showAdvancedSettings}
                    />
                    <label for="advanced-settings"><h4>Advanced Settings</h4></label>
                </div>
            </div>

            <!-- Date Picker -->
            <div class="grid-item">
                {#if showAdvancedSettings}
                <div class="date-picker-container">
                    <div class="date-checkbox">
                        <input
                            type="checkbox"
                            id="enable-date-override"
                            bind:checked={enableDateOverride}
                        />
                        <label for="enable-date-override"><h4>Use custom date</h4></label>
                    </div>
                </div>
                {/if}
            </div>

            <!-- Genre Selector -->
            <div class="grid-item">
                {#if showAdvancedSettings}
                <div class="genre-selector">
                    <button
                        class="genre-dropdown-button"
                        on:click={() => genreDropdownOpen = !genreDropdownOpen}
                    >
                        Genres: ({selectedGenres.size}/{allGenres.length})
                        <span class="dropdown-arrow">{genreDropdownOpen ? '▲' : '▼'}</span>
                    </button>

                    {#if genreDropdownOpen}
                        <div class="genre-dropdown-menu">
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
                                <label class="genre-checkbox-item">
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
                        class="genre-dropdown-button"
                        on:click={() => nameDropdownOpen = !nameDropdownOpen}
                    >
                        Search Terms: ({selectedNames.size}/{availableNames.length})
                        <span class="dropdown-arrow">{nameDropdownOpen ? '▲' : '▼'}</span>
                    </button>

                    {#if nameDropdownOpen}
                        <div class="genre-dropdown-menu">
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
                                <label class="genre-checkbox-item">
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
    </main>
</div>

