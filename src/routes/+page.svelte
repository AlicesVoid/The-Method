<style>
    :global(body) {
        background-color: white;
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
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
        min-height: calc(100vh - 10.5rem); /* Full height minus headers */
    }

    .grid-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        max-width: 100%;
        margin: 0 auto;
        background-color: #f5f5f5;
        border: 0.5rem solid black;
        border-top: 0rem;
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

    .new-button {
        padding: 0.75rem 2rem;
        font-size: 1rem;
        background-color: lightyellow;
        color: black;
        border: 2px solid black;
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: bold;
        transition: transform 0.2s ease;
        width: 25%;
    }

    .new-button:hover {
        transform: scale(1.05);
    }

    .old-button {
        padding: 0.75rem 2rem;
        font-size: 1rem;
        background-color: lightblue;
        color: black;
        border: 2px solid black;
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: bold;
        transition: transform 0.2s ease;
        width: 25%;
    }

    .old-button:hover {
        transform: scale(1.05);
    }

    .item-content {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .filter-dropdown-container {
        position: relative;
    }

    .filter-button {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        background-color: #333;
        color: white;
        border: none;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: background-color 0.3s ease;
        font-weight: bold;
    }

    .filter-button:hover {
        background-color: #555;
    }

    .filter-button:active {
        transform: scale(0.98);
    }

    .checkbox-dropdown {
        position: absolute;
        top: calc(100% + 0.5rem);
        left: 0;
        background-color: white;
        border: 2px solid black;
        border-radius: 0.5rem;
        padding: 1rem;
        min-width: 200px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10;
    }

    .checkbox-dropdown h3 {
        margin-top: 0;
        margin-bottom: 1rem;
        font-size: 1.1rem;
    }

    .checkbox-dropdown label {
        display: block;
        margin-bottom: 0.5rem;
        cursor: pointer;
    }

    .checkbox-dropdown input[type="checkbox"] {
        margin-right: 0.5rem;
        cursor: pointer;
    }

    .search-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .search-bar {
        width: 100%;
        padding-top: 0.75rem;
        padding-bottom: 0.75rem;
        font-size: 1rem;
        border: 2px solid black;
        border-radius: 0.5rem;
    }

</style>

<script>
    let showFilters = false;

    function toggleFilters() {
        showFilters = !showFilters;
    }
</script>

<header class="header-base header">
    <h4>Mapped by KVN AUST & Mika_Virus</h4>
    <h1>Youtube's Recycle Bin | Maps</h1>
    <div class="youtube-badge">
        <img src="/kvnaust.jpg" alt="KVN AUST" />
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
                <button class="new-button">Random Video (New)</button>
                <button class="old-button">Random Video (Old)</button>
            </div>

            <div class="item-content">
                <div class="filter-dropdown-container">
                    <button class="filter-button" on:click={toggleFilters}>
                        Filters
                    </button>

                    {#if showFilters}
                        <div class="checkbox-dropdown">
                            <h3>Filters</h3>
                            <label>
                                <input type="checkbox" />
                                Option 1
                            </label>
                            <label>
                                <input type="checkbox" />
                                Option 2
                            </label>
                            <label>
                                <input type="checkbox" />
                                Option 3
                            </label>
                            <label>
                                <input type="checkbox" />
                                Option 4
                            </label>
                        </div>
                    {/if}
                </div>

                <div class="search-section">
                    <input
                        type="text"
                        class="search-bar"
                        placeholder="Search videos..."
                    />
                </div>
            </div>
        </div>
    </div>
</main>

