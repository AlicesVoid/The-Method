<script lang="ts">
    import { SearchSettings } from '$lib/search-settings.js';

    // Create settings instance
    const settings = new SearchSettings();

    // Track current age filter
    let currentAgeFilter: string = 'any';

    // Track advanced settings visibility
    let showAdvancedSettings: boolean = false;

    // Track "before date" filter - default to today's date
    let beforeDate: string = (() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    })();

    // All unique genres from both new-patterns and old-patterns
    const allGenres = [
        'App',
        'Body Cam',
        'Camera',
        'Dashcam',
        'Drone',
        'Drone / Dashcam',
        'Filter: Playlist',
        'Format',
        'Game Capture',
        'Game Capture / Misc',
        'GoPro',
        'iPhone',
        'Misc',
        'MOLOES',
        'Nintendo DS',
        'NSFW',
        'Screen Recorder',
        'Smartphone',
        'VHS',
        'Video Editor',
        'VR Headset',
        'Webcam',
        'Zoom'
    ].sort();

    // Track selected genres (all selected by default)
    let selectedGenres: Set<string> = new Set(allGenres);

    // Track if "Select All" is checked
    let selectAllGenres: boolean = true;

    // Track if genre dropdown is open
    let genreDropdownOpen: boolean = false;

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

    /**
     * Open YouTube search in new tab with the given search term
     */
    function openYouTubeSearch(searchTerm: string) {
        // Build the search query with optional "before:" date filter
        let searchQuery = searchTerm;

        // Add "before:" filter if advanced settings is enabled and date is selected
        if (showAdvancedSettings && beforeDate) {
            const date = new Date(beforeDate);
            // Format as YYYY/MM/DD for YouTube search
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            searchQuery += ` before:${year}/${month}/${day}`;
        }

        // Encode the complete search query for URL
        const encodedQuery = encodeURIComponent(searchQuery);

        // YouTube search URL - add sort by upload date if "new" is selected
        let youtubeSearchURL = `https://www.youtube.com/results?search_query=${encodedQuery}`;

        if (currentAgeFilter === 'new') {
            // Add sort by upload date parameter
            youtubeSearchURL += '&sp=CAI%253D';
        }

        // Open in new tab
        window.open(youtubeSearchURL, '_blank');
    }

    /**
     * Handle button click - generate search term and open YouTube
     */
    function handleFindVideos() {
        const searchTerm = settings.generateSearchTerm();

        if (searchTerm) {
            openYouTubeSearch(searchTerm);
        } else {
            console.error('Failed to generate search term');
        }
    }

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

    :global(body) {
        background-color: white;
        margin: 0;
        padding: 0;
        font-family: 'Arial', sans-serif;
    }
    
    .header-base {
        height: 5rem;
        border: 0.5rem solid black;
        align-items: center;
        display: flex;
        padding: 0 1rem;
    }
    
    .header {
        background-color: lightcoral;        
        justify-content: space-between;

    }
    
    .header-2 {
        background-color: lightblue;
        border-top: 0rem;
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
        background-color: white;
        border: 0.5rem solid black;
        border-top: 0rem;
        height: fit-content;
        /* min-height: calc(100vh - 10.5rem); /* Full height minus headers */
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
        background-color: lightsalmon;
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
        background-color: white;
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
        background-color: lightsalmon;
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

</style>

<header class="header-base header">
    <h4>Mapped by KVN AUST & Mika_Virus</h4>
    <h1>Youtube's Recycle Bin | Maps</h1>
    <div class="youtube-badge">
        <img src="/kvnaust.jpg" alt="KVN AUST"/>
        <h1>YouTube.com/KVNAUST</h1>
    </div>
</header>
<header class="header-base header-2">
    <h1>Find New, Old, and Forgotten Youtube Videos with ~0 Views</h1>
</header>

<main class="content-body">
    <div class="grid-container">
        <div class="grid-item">
            <div class="top-buttons">
                <button class="rand-button" on:click={handleFindVideos}><h2>Find Random Videos!</h2></button>
            </div>

        </div>

    </div>
    <div class="grid-container">
        <div class="grid-item">
            <div class="filter-container">
                <span><h2>Show me</h2></span>
                <select class="filter-select" on:change={handleAgeChange}>
                    <option value="any" selected>Any</option>
                    <option value="old">Old</option>
                    <option value="new">New</option>
                </select>
                <span><h2>Videos</h2></span>
            </div>
        </div>
    </div>
    <div class="grid-container">
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
        
            <div class="grid-item">
                {#if showAdvancedSettings}
                <div class="filter-container">
                    <span><h4>Before:</h4></span>
                    <input
                        type="date"
                        class="filter-select"
                        bind:value={beforeDate}
                    />
                </div>
                {/if}
            </div>
            <div class="grid-item">
                {#if showAdvancedSettings}
                <div class="genre-selector">
                    <button
                        class="genre-dropdown-button"
                        on:click={() => genreDropdownOpen = !genreDropdownOpen}
                    >
                        Select Genres ({selectedGenres.size}/{allGenres.length})
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
    </div>
</main>

