<script lang="ts">
    // ============================================================================
    // IMPORTS
    // ============================================================================
    import { SearchSettings } from '$lib/search-settings.js';
    import searchTermsData from '$lib/search-terms.json' with { type: "json" };
    import { base } from '$app/paths';

    // ============================================================================
    // CONSTANTS & DERIVED DATA (Computed Once)
    // ============================================================================

    // Settings instance
    const settings = new SearchSettings();

    // Extract all unique genres from search-terms.json
    const allGenres = (() => {
        const data = searchTermsData as any;
        const allPatterns = [...data['new-patterns'], ...data['old-patterns']];
        const genres = new Set<string>();

        for (const pattern of allPatterns) {
            genres.add(pattern.genre);
        }

        // Sort alphabetically, but put NSFW at the top
        return Array.from(genres).sort((a, b) => {
            if (a === 'NSFW') return -1; // NSFW always first
            if (b === 'NSFW') return 1;
            return a.localeCompare(b); // Others alphabetically
        });
    })();

    // Extract all unique names from search-terms.json
    const allNames = (() => {
        const data = searchTermsData as any;
        const allPatterns = [...data['new-patterns'], ...data['old-patterns']];
        const names = new Set<string>();

        for (const pattern of allPatterns) {
            names.add(pattern.name);
        }

        // Sort with empty string first, then alphabetically
        return Array.from(names).sort((a, b) => {
            if (a === '') return -1;
            if (b === '') return 1;
            return a.localeCompare(b);
        });
    })();

    // ============================================================================
    // STATE: ADVANCED SETTINGS
    // ============================================================================

    let showAdvancedSettings: boolean = false;

    // ============================================================================
    // STATE: AGE FILTER
    // ============================================================================

    let currentAgeFilter: string = 'any';

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
    // STATE: GENRE SELECTION
    // ============================================================================

    // All genres selected by default EXCEPT NSFW
    let selectedGenres: Set<string> = new Set(allGenres.filter(genre => genre !== 'NSFW'));
    let selectAllGenres: boolean = false;
    let genreDropdownOpen: boolean = false;

    // ============================================================================
    // STATE: NAME/SEARCH TERM SELECTION
    // ============================================================================

    // All names selected by default
    let selectedNames: Set<string> = new Set(allNames);
    let selectAllNames: boolean = true;
    let nameDropdownOpen: boolean = false;

    // ============================================================================
    // REACTIVE: NAME FILTERING
    // ============================================================================

    /**
     * Get names that match the selected genres
     * Reactive - updates when selectedGenres or showAdvancedSettings changes
     */
    $: availableNames = (() => {
        // If all genres are selected or advanced settings is off, show all names
        if (!showAdvancedSettings || selectedGenres.size === 0 || selectedGenres.size === allGenres.length) {
            return allNames;
        }

        const data = searchTermsData as any;
        const allPatterns = [...data['new-patterns'], ...data['old-patterns']];
        const matchingNames = new Set<string>();

        // Find all names that have at least one pattern with a selected genre
        for (const pattern of allPatterns) {
            if (selectedGenres.has(pattern.genre)) {
                matchingNames.add(pattern.name);
            }
        }

        // Return filtered list, sorted with empty string first
        return Array.from(matchingNames).sort((a, b) => {
            if (a === '') return -1;
            if (b === '') return 1;
            return a.localeCompare(b);
        });
    })();

    /**
     * Sync selectedNames when availableNames changes
     * Remove any selected names that are no longer available
     */
    $: {
        const availableSet = new Set(availableNames);
        const newSelectedNames = new Set<string>();

        for (const name of selectedNames) {
            if (availableSet.has(name)) {
                newSelectedNames.add(name);
            }
        }

        // Only update if something changed to avoid infinite loop
        if (newSelectedNames.size !== selectedNames.size) {
            selectedNames = newSelectedNames;
            // Update selectAllNames checkbox state
            selectAllNames = selectedNames.size === availableNames.length && availableNames.length > 0;
        }
    }

    // ============================================================================
    // FUNCTIONS: GENRE SELECTION
    // ============================================================================

    /**
     * Toggle individual genre selection
     */
    function toggleGenre(genre: string) {
        if (selectedGenres.has(genre)) {
            selectedGenres.delete(genre);
            selectedGenres = selectedGenres; // Trigger reactivity
            selectAllGenres = false;
        } else {
            selectedGenres.add(genre);
            selectedGenres = selectedGenres; // Trigger reactivity
            // Check if all genres are selected
            if (selectedGenres.size === allGenres.length) {
                selectAllGenres = true;
            }
        }
    }

    /**
     * Toggle "Select All" for genres
     */
    function toggleSelectAll() {
        selectAllGenres = !selectAllGenres;
        if (selectAllGenres) {
            selectedGenres = new Set(allGenres);
        } else {
            selectedGenres = new Set();
        }
    }

    // ============================================================================
    // FUNCTIONS: NAME SELECTION
    // ============================================================================

    /**
     * Toggle individual name selection
     * Note: Duplicates are handled automatically since we use a Set
     * Multiple patterns can have the same name, but the Set ensures
     * toggling one name affects all patterns with that name
     */
    function toggleName(name: string) {
        if (selectedNames.has(name)) {
            selectedNames.delete(name);
            selectedNames = selectedNames; // Trigger reactivity
            selectAllNames = false;
        } else {
            selectedNames.add(name);
            selectedNames = selectedNames; // Trigger reactivity
            // Check if all available names are selected
            if (selectedNames.size === availableNames.length) {
                selectAllNames = true;
            }
        }
    }

    /**
     * Toggle "Select All" for names
     */
    function toggleSelectAllNames() {
        selectAllNames = !selectAllNames;
        if (selectAllNames) {
            selectedNames = new Set(availableNames);
        } else {
            selectedNames = new Set();
        }
    }

    // ============================================================================
    // FUNCTIONS: AGE FILTER
    // ============================================================================

    /**
     * Handle age filter change
     */
    function handleAgeChange(event: Event) {
        const target = event.target as HTMLSelectElement;
        const value = target.value;

        // Track the current filter for YouTube sorting
        currentAgeFilter = value;

        // Reset age filters
        settings.enableNew();
        settings.enableOld();

        // Apply selected filter
        if (value === 'old') {
            settings.disableNew();
        } else if (value === 'new') {
            settings.disableOld();
        }
    }

    // ============================================================================
    // FUNCTIONS: YOUTUBE SEARCH
    // ============================================================================

    /**
     * Open YouTube search in new tab with the given search term
     */
    function openYouTubeSearch(searchTerm: string) {
        // Build the search query with optional "before:" date filter
        let searchQuery = searchTerm;

        // Add "before:" filter if advanced settings is enabled, date override is enabled, and date is selected
        if (showAdvancedSettings && enableDateOverride && beforeDate) {
            const date = new Date(beforeDate);
            // Format as YYYY/MM/DD for YouTube search
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            searchQuery += ` before:${year}/${month}/${day}`;
        }

        // Encode the complete search query for URL
        const encodedQuery = encodeURIComponent(searchQuery);

        // YouTube search URL - always sort by upload date
        let youtubeSearchURL = `https://www.youtube.com/results?search_query=${encodedQuery}`;

        // Always add sort by upload date parameter
        youtubeSearchURL += '&sp=CAI%253D';

        // Open in new tab
        window.open(youtubeSearchURL, '_blank');
    }

    /**
     * Handle button click - generate search term and open YouTube
     */
    function handleFindVideos() {
        // Clear all exclusions first
        settings.clearExclusions();

        // Apply genre filters from advanced settings if enabled
        if (showAdvancedSettings && selectedGenres.size > 0 && selectedGenres.size < allGenres.length) {
            // Clear all genres first
            settings.enableAllGenres();

            // Disable all genres, then enable only selected ones
            for (const genre of allGenres) {
                if (!selectedGenres.has(genre)) {
                    settings.disableGenre(genre);
                }
            }

            // Enable selected genres
            for (const genre of selectedGenres) {
                settings.enableGenre(genre);
            }
        } else {
            // If all selected or advanced settings off, enable all genres
            settings.enableAllGenres();
        }

        // Apply name filters from advanced settings if enabled
        // Only skip if ALL names are selected OR advanced settings is off
        if (showAdvancedSettings && selectedNames.size < availableNames.length) {
            // If no names selected, exclude everything (will fail gracefully)
            // Otherwise, exclude only the AVAILABLE names that are NOT selected
            // This prevents excluding names from other genres
            for (const name of availableNames) {
                if (!selectedNames.has(name)) {
                    settings.excludePattern(name);
                }
            }
        }

        // Prepare override date if enabled
        let overrideDate: Date | undefined = undefined;
        if (showAdvancedSettings && enableDateOverride && beforeDate) {
            overrideDate = new Date(beforeDate);
        }

        const searchTerm = settings.generateSearchTerm(overrideDate);

        if (searchTerm) {
            openYouTubeSearch(searchTerm);
        } else {
            console.error('Failed to generate search term');
        }
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
    }

    .header a:hover {
    text-decoration: none;
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
        <h4><a href="https://x.com/MingKasterMK/status/1965144635388653811/photo/1">Mapped by KVN AUST & Mika_Virus</a></h4>
        <h1>Youtube's Recycle Bin | Randomizer</h1>
        <div class="youtube-badge">
            <img src="{base}/kvnaust.jpg" alt="KVN AUST"/>
            <h1>YouTube.com/KVNAUST</h1>
        </div>
    </header>

    <!-- Second Header -->
    <header class="header-base header-2">
        <h1>Find New, Old, and Forgotten Youtube Videos with ~0 Views</h1>
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
                                    checked={selectAllGenres}
                                    on:change={toggleSelectAll}
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
                            <!-- Select All checkbox -->
                            <label class="genre-checkbox-item select-all">
                                <input
                                    type="checkbox"
                                    checked={selectAllNames}
                                    on:change={toggleSelectAllNames}
                                />
                                <span>Select All</span>
                            </label>

                            <div class="genre-divider"></div>

                            <!-- Individual name checkboxes -->
                            {#each (() => {
                                const seen = new Set();
                                return availableNames.filter(name => {
                                    const trimmed = name.trim();
                                    if (seen.has(trimmed)) return false;
                                    seen.add(trimmed);
                                    return true;
                                });
                            })() as name}
                                <label class="genre-checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={selectedNames.has(name)}
                                        on:change={() => toggleName(name)}
                                    />
                                    <span>{name === '' ? '(empty string)' : name}</span>
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

