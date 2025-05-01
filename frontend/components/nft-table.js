import './toggle-button.js';
import './show-button.js';
import './nft-table-row.js';

/**
 * NFTTable Web Component
 *
 * A customizable grid-based component for displaying NFT data
 * with row components for better encapsulation and performance.
 *
 * @element nft-table
 * @fires show-nft - Fired when an NFT should be displayed
 * @fires edit-nft - Fired when an NFT should be edited
 * @fires toggle-nft-status - Fired when the status of an NFT changes
 * @fires create-promotion - Fired when a new promotion should be created
 * @fires data-loaded - Fired when data has been successfully loaded
 * @fires data-error - Fired when an error occurs while loading data
 * @fires data-filtered - Fired when data is filtered
 *
 * @attr {string} src - URL for loading NFT data
 * @attr {string} loading - Indicates whether data is being loaded ('true'/'false')
 *
 * @csspart data-grid - The grid itself
 * @csspart grid-header - The header row of the grid
 * @csspart header-cell - The header cells
 * @csspart grid-body - The main body of the grid
 * @csspart separator - The separator area
 * @csspart grid-footer - The footer of the grid
 * @csspart footer-content - The content of the footer
 */
export class NFTTable extends HTMLElement {
    // Static template for better performance
    static template = document.createElement('template');
    
    static {
        // Initialize the template once for all instances
        NFTTable.template.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: var(--nft-font-family, sans-serif);
                    position: relative;
                }
                
                .loading-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 200px;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.3);
                    z-index: 100;
                }
                
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: var(--nft-accent-color, #3498db);
                    animation: spin 1s ease-in-out infinite;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .data-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr 2fr 2fr 1fr;
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .grid-header {
                    display: contents;
                }
                
                .header-cell {
                    padding: 12px 16px;
                    font-weight: bold;
                    background-color: var(--nft-header-bg, #2c3e50);
                    color: var(--nft-header-color, white);
                    text-align: left;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                
                .grid-body {
                    display: contents;
                }
                
                .separator {
                    grid-column: 1 / -1;
                    height: 2px;
                    background-color: var(--nft-separator-color, #34495e);
                }
                
                .empty-message, .loading-message, .error-message {
                    grid-column: 1 / -1;
                    padding: 20px;
                    text-align: center;
                    color: var(--nft-text-color, #95a5a6);
                }
                
                .grid-footer {
                    grid-column: 1 / -1;
                    padding: 16px;
                    background-color: var(--nft-footer-bg, #2c3e50);
                    color: var(--nft-footer-color, white);
                }
                
                .retry-button {
                    background-color: var(--nft-button-bg, #3498db);
                    color: var(--nft-button-text, white);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    margin-top: 10px;
                    cursor: pointer;
                }
                
                .retry-button:hover {
                    background-color: var(--nft-button-hover-bg, #2980b9);
                }
                
                /* Responsive Design - important change here */
                @media (max-width: 768px) {
                    .data-grid {
                        display: block; /* Wichtig: Ändert das Display-Modell */
                    }
                    
                    .grid-header {
                        display: none; /* Header ausblenden bei schmalen Screens */
                    }
                    
                    .grid-body {
                        display: block; /* Block statt contents für korrekte Flussrichtung */
                    }
                    
                    .separator {
                        display: none; /* Separator ausblenden bei schmalen Screens */
                    }
                    
                    .grid-footer {
                        display: block;
                        width: 100%;
                    }
                    
                    .empty-message, .loading-message, .error-message {
                        display: block;
                    }
                }
            </style>
            
            <div part="container" class="container">
                <div part="data-grid" class="data-grid">
                    <div part="grid-header" class="grid-header">
                        <div part="header-cell" class="header-cell">IP-NFT</div>
                        <div part="header-cell" class="header-cell">Type</div>
                        <div part="header-cell" class="header-cell">TOPICS</div>
                        <div part="header-cell" class="header-cell">Actions</div>
                        <div part="header-cell" class="header-cell">Active</div>
                    </div>
                    
                    <div part="grid-body" class="grid-body">
                        <div part="separator" class="separator"></div>
                        <div part="loading-message" class="loading-message">
                            <slot name="loading-text">Loading NFT data...</slot>
                        </div>
                    </div>
                    
                    <div part="grid-footer" class="grid-footer">
                        <slot name="footer-content"></slot>
                    </div>
                </div>
                
                <div part="loading-container" class="loading-container" style="display: none;">
                    <div part="loading-spinner" class="loading-spinner"></div>
                </div>
            </div>
        `;
    }

    // Private fields
    #nfts = [];
    #grid = null;
    #gridBody = null;
    #loadingContainer = null;
    #abortController = null;
    #initialized = false;
    #boundHandlers = {
        showAction: null,
        editAction: null,
        rowToggleStatus: null,
        rowOfflineClick: null,
        retryClick: null
    };

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        
        // Bind event handlers
        this.#boundHandlers = {
            showAction: this._handleShowAction.bind(this),
            editAction: this._handleEditAction.bind(this),
            rowToggleStatus: this._handleRowToggleStatus.bind(this),
            rowOfflineClick: this._handleRowOfflineClick.bind(this),
            retryClick: this.loadNFTData.bind(this)
        };
    }

    connectedCallback() {
        if (!this.#initialized) {
            this._initialize();
        }
        
        // Load data if src is present
        if (this.hasAttribute('src')) {
            this.loadNFTData();
        }
        
        this._addEventListeners();
    }
    
    disconnectedCallback() {
        this._removeEventListeners();
        
        // Abort any ongoing fetch requests
        if (this.#abortController) {
            this.#abortController.abort();
            this.#abortController = null;
        }
    }

    static get observedAttributes() {
        return ['src', 'loading'];
    }

    // Getters and setters for attributes
    get src() {
        return this.getAttribute('src');
    }

    set src(value) {
        if (value) {
            this.setAttribute('src', value);
        } else {
            this.removeAttribute('src');
        }
    }
    
    get loading() {
        return this.hasAttribute('loading') && this.getAttribute('loading') !== 'false';
    }
    
    set loading(value) {
        const isLoading = Boolean(value);
        if (isLoading) {
            this.setAttribute('loading', 'true');
        } else {
            this.removeAttribute('loading');
        }
        
        // Update UI
        if (this.#loadingContainer) {
            this.#loadingContainer.style.display = isLoading ? 'flex' : 'none';
        }
    }
    
    get nfts() {
        return [...this.#nfts]; // Return a copy to prevent modifying the original
    }
    
    set nfts(data) {
        if (Array.isArray(data)) {
            this.#nfts = [...data];
            this.render();
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        switch (name) {
            case 'src':
                if (this.isConnected) {
                    this.loadNFTData();
                }
                break;
            case 'loading':
                const isLoading = newValue !== null && newValue !== 'false';
                if (this.#loadingContainer) {
                    this.#loadingContainer.style.display = isLoading ? 'flex' : 'none';
                }
                break;
        }
    }
    
    /**
     * Initializes the component
     * @private
     */
    _initialize() {
        // Clone template
        this.shadowRoot.appendChild(NFTTable.template.content.cloneNode(true));
        
        // Store DOM references
        this.#grid = this.shadowRoot.querySelector('.data-grid');
        this.#gridBody = this.shadowRoot.querySelector('.grid-body');
        this.#loadingContainer = this.shadowRoot.querySelector('.loading-container');
        
        // Set initialization status
        this.#initialized = true;
    }

    /**
     * Loads NFT data from the specified URL
     * @returns {Promise<void>}
     */
    async loadNFTData() {
        try {
            // Abort any ongoing requests
            if (this.#abortController) {
                this.#abortController.abort();
            }
            
            // Create new AbortController for this request
            this.#abortController = new AbortController();
            
            if (!this.src) {
                this.#nfts = [];
                this.render();
                return;
            }
            
            this.loading = true;
            
            // Clear grid body and show loading message
            if (this.#gridBody) {
                this.#gridBody.innerHTML = `
                    <div part="separator" class="separator"></div>
                    <div part="loading-message" class="loading-message">
                        <slot name="loading-text">Loading NFT data...</slot>
                    </div>
                `;
            }
            
            // Load data with timeout
            const timeoutId = setTimeout(() => {
                if (this.#abortController) {
                    this.#abortController.abort('timeout');
                }
            }, 10000); // 10 second timeout
            
            try {
                this.#nfts = await this._fetchNFTData(this.src, this.#abortController.signal);
                clearTimeout(timeoutId);
                
                // Dispatch event that data was loaded
                this.dispatchEvent(new CustomEvent('data-loaded', {
                    bubbles: true,
                    composed: true,
                    detail: { 
                        count: this.#nfts.length,
                        source: this.src
                    }
                }));
                
                // Render the loaded data
                this.render();
            } finally {
                clearTimeout(timeoutId);
                this.loading = false;
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error loading NFT data:', error);
                this._renderErrorState(error.message);
                
                // Dispatch error event
                this.dispatchEvent(new CustomEvent('data-error', {
                    bubbles: true,
                    composed: true, 
                    detail: { 
                        error,
                        source: this.src
                    }
                }));
            }
            this.loading = false;
        }
    }

    /**
     * Fetches data from the specified URL
     * @param {string} src - URL to load the data from
     * @param {AbortSignal} signal - Signal to abort the request
     * @returns {Promise<Array>} The loaded NFT data
     * @private
     */
    async _fetchNFTData(src, signal) {
        try {
            const response = await fetch(src, { 
                signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Fetch aborted');
            } else {
                console.error('Error fetching NFT data:', error);
            }
            throw error;
        }
    }

    /**
     * Renders an error state
     * @param {string} message - The error message to display
     * @private
     */
    _renderErrorState(message = 'Unable to load NFT data. Please try again later.') {
        if (!this.#gridBody) return;
        
        this.#gridBody.innerHTML = `
            <div part="separator" class="separator"></div>
            <div part="error-message" class="error-message">
                ${message}
                <button part="retry-button" class="retry-button">
                    Retry
                </button>
            </div>
        `;
        
        // Add event listener for retry button
        const retryButton = this.#gridBody.querySelector('.retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', this.#boundHandlers.retryClick);
        }
    }

    /**
     * Rendert die komplette Tabelle
     */
    render() {
        if (!this.#gridBody) return;
        
        // Clear grid body except for separator
        this.#gridBody.innerHTML = `
            <div part="separator" class="separator"></div>
        `;
        
        if (!this.#nfts || this.#nfts.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.setAttribute('part', 'empty-message');
            emptyMessage.classList.add('empty-message');
            emptyMessage.innerHTML = '<slot name="empty-text">No NFT data available</slot>';
            
            this.#gridBody.appendChild(emptyMessage);
            return;
        }
        
        // Batch DOM updates with DocumentFragment
        const fragment = document.createDocumentFragment();
        
        // Render NFT rows using the NFTTableRow component
        this.#nfts.forEach(nft => {
            const rowElement = document.createElement('nft-table-row');
            
            // Set data through attributes
            rowElement.setAttribute('nft-id', nft.id || '');
            rowElement.setAttribute('nft-type', nft.type || '');
            rowElement.setAttribute('nft-categories', nft.categories?.join(', ') || '');
            rowElement.setAttribute('nft-status', this._getToggleButtonClass(nft));
            
            // Set the full data object
            rowElement.nftData = nft;
            
            // Add event listeners
            rowElement.addEventListener('toggle-status', this.#boundHandlers.rowToggleStatus);
            rowElement.addEventListener('offline-click', this.#boundHandlers.rowOfflineClick);
            
            // Append to fragment
            fragment.appendChild(rowElement);
        });
        
        // Append all rows at once
        this.#gridBody.appendChild(fragment);
    }
    
    /**
     * Adds event listeners
     * @private
     */
    _addEventListeners() {
        if (!this.shadowRoot) return;
        
        // Listen for events from the row components and show-buttons
        this.shadowRoot.addEventListener('show-action', this.#boundHandlers.showAction);
        this.shadowRoot.addEventListener('edit-action', this.#boundHandlers.editAction);
    }

    /**
     * Removes event listeners
     * @private
     */
    _removeEventListeners() {
        if (!this.shadowRoot) return;
        
        this.shadowRoot.removeEventListener('show-action', this.#boundHandlers.showAction);
        this.shadowRoot.removeEventListener('edit-action', this.#boundHandlers.editAction);
        
        // Remove row-specific event listeners
        const rows = this.shadowRoot.querySelectorAll('nft-table-row');
        rows.forEach(row => {
            row.removeEventListener('toggle-status', this.#boundHandlers.rowToggleStatus);
            row.removeEventListener('offline-click', this.#boundHandlers.rowOfflineClick);
        });
        
        // Remove retry button listener if it exists
        const retryButton = this.shadowRoot.querySelector('.retry-button');
        if (retryButton) {
            retryButton.removeEventListener('click', this.#boundHandlers.retryClick);
        }
    }
    
    /**
     * Handles toggle-status events from row components
     * @param {CustomEvent} event - The toggle-status event
     * @private
     */
    _handleRowToggleStatus(event) {
        const { nftId, status, nft } = event.detail;
        
        // Find and update the NFT
        const nftIndex = this.#nfts.findIndex(item => item.id === nftId);
        if (nftIndex >= 0) {
            // Update local data
            this.#nfts[nftIndex] = { ...this.#nfts[nftIndex], status };
            
            // Forward the event
            this.dispatchEvent(new CustomEvent('toggle-nft-status', {
                bubbles: true,
                composed: true,
                detail: { nftId, status, nft: this.#nfts[nftIndex] }
            }));
        }
    }
    
    /**
     * Handles offline-click events from row components
     * @param {CustomEvent} event - The offline-click event
     * @private
     */
    _handleRowOfflineClick(event) {
        const { nftId, nft } = event.detail;
        
        // Forward the event
        this.dispatchEvent(new CustomEvent('create-promotion', {
            bubbles: true,
            composed: true,
            detail: { nftId, nft }
        }));
    }
    
    /**
     * Handles show-action events
     * @param {CustomEvent} event - The show-action event
     * @private
     */
    _handleShowAction(event) {
        const { itemId } = event.detail;
        if (!itemId) return;
        
        const nft = this.#nfts.find(item => item.id === itemId);
        if (!nft) return;
        
        this.dispatchEvent(new CustomEvent('show-nft', {
            bubbles: true,
            composed: true,
            detail: { nft }
        }));
    }
    
    /**
     * Handles edit-action events
     * @param {CustomEvent} event - The edit-action event
     * @private
     */
    _handleEditAction(event) {
        const { itemId } = event.detail;
        if (!itemId) return;
        
        const nft = this.#nfts.find(item => item.id === itemId);
        if (!nft) return;
        
        this.dispatchEvent(new CustomEvent('edit-nft', {
            bubbles: true,
            composed: true,
            detail: { nft }
        }));
    }
    
    /**
     * Determines the CSS class for the toggle button
     * @param {Object} nft - The NFT object
     * @returns {string} The status value
     * @private
     */
    _getToggleButtonClass(nft) {
        if (!nft.status || nft.status === 'offline') {
            return 'offline';
        }
        return nft.status;
    }
    
    /**
     * Filters the NFT data by the specified search term
     * @param {string} searchTerm - The search term
     * @public
     */
    filterNFTs(searchTerm) {
        if (!searchTerm || typeof searchTerm !== 'string') {
            this.render();
            return;
        }
        
        const term = searchTerm.toLowerCase().trim();
        
        const filteredNFTs = this.#nfts.filter(nft => {
            // Suche in verschiedenen Feldern
            return (
                (nft.id && nft.id.toLowerCase().includes(term)) ||
                (nft.type && nft.type.toLowerCase().includes(term)) ||
                (nft.categories && nft.categories.some(cat => 
                    cat.toLowerCase().includes(term)
                ))
            );
        });
        
        // Clear grid body except for separator
        this.#gridBody.innerHTML = `
            <div part="separator" class="separator"></div>
        `;
        
        if (filteredNFTs.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.setAttribute('part', 'empty-message');
            emptyDiv.classList.add('empty-message');
            emptyDiv.textContent = `No results found for "${searchTerm}"`;
            
            this.#gridBody.appendChild(emptyDiv);
        } else {
            // Batch DOM updates with DocumentFragment
            const fragment = document.createDocumentFragment();
            
            // Add filtered rows
            filteredNFTs.forEach(nft => {
                const rowElement = document.createElement('nft-table-row');
                
                // Set data through attributes
                rowElement.setAttribute('nft-id', nft.id || '');
                rowElement.setAttribute('nft-type', nft.type || '');
                rowElement.setAttribute('nft-categories', nft.categories?.join(', ') || '');
                rowElement.setAttribute('nft-status', this._getToggleButtonClass(nft));
                
                // Set the full data object
                rowElement.nftData = nft;
                
                // Add event listeners
                rowElement.addEventListener('toggle-status', this.#boundHandlers.rowToggleStatus);
                rowElement.addEventListener('offline-click', this.#boundHandlers.rowOfflineClick);
                
                // Append to fragment
                fragment.appendChild(rowElement);
            });
            
            // Append all rows at once
            this.#gridBody.appendChild(fragment);
        }
        
        // Dispatch event that data was filtered
        this.dispatchEvent(new CustomEvent('data-filtered', {
            bubbles: true,
            composed: true,
            detail: { 
                count: filteredNFTs.length,
                searchTerm
            }
        }));
    }
    
    /**
     * Updates a single NFT in the table
     * @param {Object} updatedNFT - The updated NFT object
     * @public
     */
    updateNFT(updatedNFT) {
        if (!updatedNFT || !updatedNFT.id) return;
        
        const index = this.#nfts.findIndex(nft => nft.id === updatedNFT.id);
        if (index >= 0) {
            // Update NFT in array
            this.#nfts[index] = { ...this.#nfts[index], ...updatedNFT };
            
            // Find and update the specific row
            const rowElement = this.shadowRoot.querySelector(`nft-table-row[nft-id="${updatedNFT.id}"]`);
            if (rowElement) {
                // Update data through attributes
                if (updatedNFT.type !== undefined) {
                    rowElement.setAttribute('nft-type', updatedNFT.type || '');
                }
                
                if (updatedNFT.categories !== undefined) {
                    rowElement.setAttribute('nft-categories', updatedNFT.categories?.join(', ') || '');
                }
                
                if (updatedNFT.status !== undefined) {
                    rowElement.setAttribute('nft-status', this._getToggleButtonClass(updatedNFT));
                }
                
                // Update the full data object
                rowElement.nftData = this.#nfts[index];
            } else {
                // Row not found, re-render the whole table
                this.render();
            }
        }
    }
    
    /**
     * Adds a new NFT to the table
     * @param {Object} nft - The NFT object to add
     * @public
     */
    addNFT(nft) {
        if (!nft || !nft.id) return;
        
        // Check if NFT already exists
        const existingIndex = this.#nfts.findIndex(item => item.id === nft.id);
        if (existingIndex >= 0) {
            // Update existing NFT
            this.updateNFT(nft);
            return;
        }
        
        // Add to array
        this.#nfts.push(nft);
        
        // Add new row if grid body exists
        if (this.#gridBody) {
            // If this is the first NFT, clear the empty message
            const emptyMessage = this.#gridBody.querySelector('.empty-message');
            if (emptyMessage) {
                emptyMessage.remove();
            }
            
            const rowElement = document.createElement('nft-table-row');
            
            // Set data through attributes
            rowElement.setAttribute('nft-id', nft.id || '');
            rowElement.setAttribute('nft-type', nft.type || '');
            rowElement.setAttribute('nft-categories', nft.categories?.join(', ') || '');
            rowElement.setAttribute('nft-status', this._getToggleButtonClass(nft));
            
            // Set the full data object
            rowElement.nftData = nft;
            
            // Add event listeners
            rowElement.addEventListener('toggle-status', this.#boundHandlers.rowToggleStatus);
            rowElement.addEventListener('offline-click', this.#boundHandlers.rowOfflineClick);
            
            // Append to grid
            this.#gridBody.appendChild(rowElement);
            
            // Dispatch event
            this.dispatchEvent(new CustomEvent('nft-added', {
                bubbles: true,
                composed: true,
                detail: { nft }
            }));
        } else {
            // If grid body doesn't exist yet, render the whole grid
            this.render();
        }
    }
    
    /**
     * Removes an NFT from the table
     * @param {string} nftId - The ID of the NFT to remove
     * @public
     */
    removeNFT(nftId) {
        if (!nftId) return;
        
        const index = this.#nfts.findIndex(nft => nft.id === nftId);
        if (index === -1) return;
        
        // Remove from array
        const removedNFT = this.#nfts.splice(index, 1)[0];
        
        // Remove from DOM
        const rowElement = this.shadowRoot.querySelector(`nft-table-row[nft-id="${nftId}"]`);
        if (rowElement) {
            // Remove event listeners
            rowElement.removeEventListener('toggle-status', this.#boundHandlers.rowToggleStatus);
            rowElement.removeEventListener('offline-click', this.#boundHandlers.rowOfflineClick);
            
            // Remove from DOM
            rowElement.remove();
            
            // Show empty message if no NFTs left
            if (this.#nfts.length === 0 && this.#gridBody) {
                const emptyMessage = document.createElement('div');
                emptyMessage.setAttribute('part', 'empty-message');
                emptyMessage.classList.add('empty-message');
                emptyMessage.innerHTML = '<slot name="empty-text">No NFT data available</slot>';
                
                this.#gridBody.appendChild(emptyMessage);
            }
            
            // Dispatch event
            this.dispatchEvent(new CustomEvent('nft-removed', {
                bubbles: true,
                composed: true,
                detail: { 
                    nftId,
                    nft: removedNFT
                }
            }));
        }
    }
    
    /**
     * Clears all NFTs from the table
     * @public
     */
    clearNFTs() {
        this.#nfts = [];
        
        if (this.#gridBody) {
            // Clear grid body except for separator
            this.#gridBody.innerHTML = `
                <div part="separator" class="separator"></div>
                <div part="empty-message" class="empty-message">
                    <slot name="empty-text">No NFT data available</slot>
                </div>
            `;
            
            // Dispatch event
            this.dispatchEvent(new CustomEvent('nfts-cleared', {
                bubbles: true,
                composed: true
            }));
        }
    }
    
    /**
     * Returns an NFT by its ID
     * @param {string} nftId - The ID of the NFT to retrieve
     * @returns {Object|null} The NFT object or null if not found
     * @public
     */
    getNFT(nftId) {
        if (!nftId) return null;
        
        const nft = this.#nfts.find(item => item.id === nftId);
        return nft ? { ...nft } : null;
    }
}

// Register component
customElements.define('nft-table', NFTTable);