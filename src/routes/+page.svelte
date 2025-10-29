<script lang="ts">
    import { SearchSettings } from '$lib/search-settings.js';

    // Create settings instance
    const settings = new SearchSettings();

    // Track current age filter
    let currentAgeFilter: string = 'any';

    // Track advanced settings visibility
    let showAdvancedSettings: boolean = false;

    /**
     * Open YouTube search in new tab with the given search term
     */
    function openYouTubeSearch(searchTerm: string) {
        // Encode the search term for URL
        const encodedTerm = encodeURIComponent(searchTerm);

        // YouTube search URL - add sort by upload date if "new" is selected
        let youtubeSearchURL = `https://www.youtube.com/results?search_query=${encodedTerm}`;

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
        <div class="grid-item">
            <div class="advanced-settings-checkbox">
                <input
                    type="checkbox"
                    id="advanced-settings"
                    bind:checked={showAdvancedSettings}
                />
                <label for="advanced-settings">Advanced Settings</label>
            </div>
        </div>
    </div>
    <div class="grid-container">
        <div class="grid-item">
            <p>Grid Item 1</p>
        </div>
        <div class="grid-item">
            <p>Grid Item 2</p>
        </div>
        <div class="grid-item">
            <p>Grid Item 3</p>
        </div>
    </div>
</main>

