import './toggle-button.js';
import './show-button.js';

/**
 * NFTTable Web Component
 * 
 * A customizable table component for displaying NFT data with actions
 * and toggle buttons for status control.
 * 
 * @element nft-table
 * @fires show-nft - Fired when an NFT should be displayed
 * @fires edit-nft - Fired when an NFT should be edited
 * @fires toggle-nft-status - Fired when an NFT's status changes
 * @fires create-promotion - Fired when a new promotion should be created
 * @fires data-loaded - Fired when data is successfully loaded
 * @fires data-error - Fired when there's an error loading data
 * @fires data-filtered - Fired when data is filtered
 * 
 * @attr {string} src - URL to load NFT data from
 * @attr {string} loading - Indicates if data is loading ('true'/'false')
 * 
 * @csspart data-table - The table itself
 * @csspart table-header - The table header
 * @csspart header-row - The header row
 * @csspart header-cell - The header cells
 * @csspart table-body - The table body
 * @csspart data-row - The data rows
 * @csspart data-cell - The data cells
 * @csspart action-cell - Cells containing action buttons
 * @csspart table-footer - The table footer
 * @csspart footer-cell - The footer cells
 * @csspart separator-row - The separator row
 * @csspart separator-cell - The separator cell
 * @csspart content-wrapper - Container for content with icons
 * @csspart content-icon - Icons in cells
 * @csspart table-text - Text content in cells
 */
export class NFTTable extends HTMLElement {
    // Static template for better performance
    static template = document.createElement('template');
    
    static {
        // Initialize the template once for all instances
        NFTTable.template.innerHTML = `
            <link rel="stylesheet" href="components/nft-table.css">
            <div part="loading-container" class="loading-container">
                <div part="loading-spinner" class="loading-spinner"></div>
            </div>
            <table part="data-table">
                <thead part="table-header">
                    <tr part="header-row">
                        <th part="header-cell">IP-NFT</th>
                        <th part="header-cell">Type</th>
                        <th part="header-cell">TOPICS</th>
                        <th part="header-cell">Actions</th>
                        <th part="header-cell">Active</th>
                    </tr>
                </thead>
                <tbody part="table-body">
                    <tr part="separator-row">
                        <td colspan="5" part="separator-cell"></td>
                    </tr>
                    <tr part="data-row loading-row">
                        <td colspan="5" part="data-cell loading-message">
                            <slot name="loading-text">Loading NFT data...</slot>
                        </td>
                    </tr>
                </tbody>
                <tfoot part="table-footer">
                    <tr>
                        <td colspan="5" part="footer-cell">
                            <slot name="footer-content"></slot>
                        </td>
                    </tr>
                </tfoot>
            </table>
        `;
    }

    // Private fields
    #nfts = [];
    #table = null;
    #tableBody = null;
    #loadingContainer = null;
    #abortController = null;
    #initialized = false;
    
    // Event handler bindings
    #boundHandlers = {
        buttonClick: null,
        toggleEvent: null,
        offlineClick: null,
        showAction: null,
        editAction: null
    };

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        
        // Bind event handlers
        this.#boundHandlers = {
            buttonClick: this._handleButtonClick.bind(this),
            toggleEvent: this._handleToggleEvent.bind(this),
            offlineClick: this._handleOfflineClick.bind(this),
            showAction: this._handleShowAction.bind(this),
            editAction: this._handleEditAction.bind(this)
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
        this.#table = this.shadowRoot.querySelector('table');
        this.#tableBody = this.shadowRoot.querySelector('tbody');
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
            
            // Load data with timeout
            const timeoutId = setTimeout(() => {
                if (this.#abortController) {
                    this.#abortController.abort('timeout');
                }
            }, 10000); // 10 second timeout
            
            try {
                this.#nfts = await this._fetchNFTData(this.src, this.#abortController.signal);
                clearTimeout(timeoutId);
                this.render();
                
                // Dispatch event that data was loaded
                this.dispatchEvent(new CustomEvent('data-loaded', {
                    bubbles: true,
                    composed: true,
                    detail: { 
                        count: this.#nfts.length,
                        source: this.src
                    }
                }));
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
     * @param {string} src - URL to fetch data from
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
        if (!this.#tableBody) return;
        
        this.#tableBody.innerHTML = `
            <tr part="separator-row">
                <td colspan="5" part="separator-cell"></td>
            </tr>
            <tr part="data-row error-row">
                <td colspan="5" part="data-cell error-message">
                    ${message}
                    <button part="retry-button" class="retry-button">
                        Retry
                    </button>
                </td>
            </tr>
        `;
        
        // Add event listener for retry button
        const retryButton = this.#tableBody.querySelector('.retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', () => this.loadNFTData());
        }
    }

    /**
     * Renders the complete table
     */
    render() {
        if (!this.#tableBody) return;
        
        if (!this.#nfts || this.#nfts.length === 0) {
            this.#tableBody.innerHTML = `
                <tr part="separator-row">
                    <td colspan="5" part="separator-cell"></td>
                </tr>
                <tr part="data-row empty-row">
                    <td colspan="5" part="data-cell empty-message">
                        <slot name="empty-text">No NFT data available</slot>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Batch DOM updates with DocumentFragment
        const fragment = document.createDocumentFragment();
        
        // Separator row
        const separatorRow = document.createElement('tr');
        separatorRow.setAttribute('part', 'separator-row');
        const separatorCell = document.createElement('td');
        separatorCell.setAttribute('part', 'separator-cell');
        separatorCell.setAttribute('colspan', '5');
        separatorRow.appendChild(separatorCell);
        fragment.appendChild(separatorRow);
        
        // Render data rows
        this.#nfts.forEach((nft, index) => {
            const row = this._createRowElement(nft, index);
            fragment.appendChild(row);
        });
        
        // Insert all rows at once
        this.#tableBody.innerHTML = '';
        this.#tableBody.appendChild(fragment);
    }

    /**
     * Creates a TR element for an NFT
     * @param {Object} nft - The NFT object
     * @param {number} index - The index of the NFT
     * @returns {HTMLElement} The created TR element
     * @private
     */
    _createRowElement(nft, index) {
        const idBase = `nft-${index}`;
        const row = document.createElement('tr');
        
        row.id = idBase;
        row.setAttribute('part', 'data-row');
        row.dataset.nftId = nft.id || '';
        
        // ID cell
        const idCell = document.createElement('td');
        idCell.id = `${idBase}-id`;
        idCell.setAttribute('part', 'data-cell');
        idCell.textContent = nft.id || 'N/A';
        row.appendChild(idCell);
        
        // Type cell
        const typeCell = document.createElement('td');
        typeCell.id = `${idBase}-type`;
        typeCell.setAttribute('part', 'data-cell');
        
        const contentWrapper = document.createElement('div');
        contentWrapper.setAttribute('part', 'content-wrapper');
        
        const icon = document.createElement('img');
        icon.src = '/img/Arrow-Down-white.png';
        icon.alt = 'Arrow Icon';
        icon.setAttribute('part', 'content-icon');
        icon.style.width = '16px';
        icon.style.height = '16px';
        contentWrapper.appendChild(icon);
        
        const typeText = document.createElement('span');
        typeText.setAttribute('part', 'table-text');
        typeText.textContent = nft.type || 'N/A';
        contentWrapper.appendChild(typeText);
        
        typeCell.appendChild(contentWrapper);
        row.appendChild(typeCell);
        
        // Topics cell
        const topicsCell = document.createElement('td');
        topicsCell.id = `${idBase}-topics`;
        topicsCell.setAttribute('part', 'data-cell');
        topicsCell.textContent = nft.categories?.join(", ") || 'N/A';
        row.appendChild(topicsCell);
        
        // Actions cell
        const actionCell = document.createElement('td');
        actionCell.id = `${idBase}-action`;
        actionCell.setAttribute('part', 'action-cell');
        
        // Show button
        const showButton = document.createElement('show-button');
        showButton.setAttribute('icon', 'icon-eye.png');
        showButton.setAttribute('action', 'show');
        showButton.setAttribute('label', 'Show Details');
        showButton.setAttribute('item-id', nft.id || '');
        actionCell.appendChild(showButton);
        
        // Edit button
        const editButton = document.createElement('show-button');
        editButton.setAttribute('icon', 'icon-edit.png');
        editButton.setAttribute('action', 'edit');
        editButton.setAttribute('label', 'Edit Promotion');
        editButton.setAttribute('item-id', nft.id || '');
        actionCell.appendChild(editButton);
        
        row.appendChild(actionCell);
        
        // Toggle cell
        const toggleCell = document.createElement('td');
        toggleCell.id = `${idBase}-toggle`;
        toggleCell.setAttribute('part', 'action-cell');
        
        const toggleButton = document.createElement('toggle-button');
        toggleButton.setAttribute('status', this._getToggleButtonClass(nft));
        toggleButton.setAttribute('offline-text', 'Create');
        toggleButton.dataset.nftId = nft.id || '';
        toggleButton.setAttribute('aria-label', 'Toggle activation status');
        toggleCell.appendChild(toggleButton);
        
        row.appendChild(toggleCell);
        
        return row;
    }

    /**
     * Adds event listeners
     * @private
     */
    _addEventListeners() {
        if (!this.shadowRoot) return;
        
        // Event delegation for better performance
        this.shadowRoot.addEventListener('click', this.#boundHandlers.buttonClick);
        
        // Add event listeners for toggle button events
        this.shadowRoot.addEventListener('toggle', this.#boundHandlers.toggleEvent);
        this.shadowRoot.addEventListener('offline-click', this.#boundHandlers.offlineClick);
        
        // Add event listeners for show button events
        this.shadowRoot.addEventListener('show-action', this.#boundHandlers.showAction);
        this.shadowRoot.addEventListener('edit-action', this.#boundHandlers.editAction);
    }

    /**
     * Removes event listeners
     * @private
     */
    _removeEventListeners() {
        if (!this.shadowRoot) return;
        
        this.shadowRoot.removeEventListener('click', this.#boundHandlers.buttonClick);
        this.shadowRoot.removeEventListener('toggle', this.#boundHandlers.toggleEvent);
        this.shadowRoot.removeEventListener('offline-click', this.#boundHandlers.offlineClick);
        this.shadowRoot.removeEventListener('show-action', this.#boundHandlers.showAction);
        this.shadowRoot.removeEventListener('edit-action', this.#boundHandlers.editAction);
    }

    /**
     * Handles button clicks
     * @param {Event} event - The click event
     * @private
     */
    _handleButtonClick(event) {
        // Find the closest button if we clicked on a child element
        const button = event.target.closest('button:not([part="retry-button"])');
        if (!button) return;
        
        // Skip toggle-button clicks
        if (button.closest('toggle-button') || button.closest('show-button')) return;
        
        const action = button.dataset.action;
        const nftId = button.dataset.nftId;
        
        if (!nftId) return;
        
        const nft = this.#nfts.find(item => item.id === nftId);
        if (!nft) return;
        
        if (action === 'show') {
            this._dispatchShowEvent(nft);
        } else if (action === 'edit') {
            this._dispatchEditEvent(nft);
        }
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
        
        this._dispatchShowEvent(nft);
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
        
        this._dispatchEditEvent(nft);
    }

    /**
     * Handles toggle events
     * @param {CustomEvent} event - The toggle event
     * @private
     */
    _handleToggleEvent(event) {
        // Make sure the event comes from a toggle-button inside our shadow DOM
        if (!event.target.matches('toggle-button')) return;
        
        const toggleButton = event.target;
        const nftId = toggleButton.dataset.nftId;
        const status = event.detail.status;
        
        if (!nftId) return;
        
        // Find the NFT and update its status
        const nftIndex = this.#nfts.findIndex(item => item.id === nftId);
        if (nftIndex >= 0) {
            // Update local data
            const nft = { ...this.#nfts[nftIndex], status };
            this.#nfts[nftIndex] = nft;
            
            // Dispatch event with status and NFT ID
            this.dispatchEvent(new CustomEvent('toggle-nft-status', {
                bubbles: true,
                composed: true,
                detail: { nftId, status, nft }
            }));
        }
    }

    /**
     * Handles offline-click events
     * @param {CustomEvent} event - The offline-click event
     * @private
     */
    _handleOfflineClick(event) {
        // Make sure the event comes from a toggle-button inside our shadow DOM
        if (!event.target.matches('toggle-button')) return;
        
        const toggleButton = event.target;
        const nftId = toggleButton.dataset.nftId;
        
        if (!nftId) return;
        
        // Find the NFT
        const nft = this.#nfts.find(item => item.id === nftId);
        if (nft) {
            // Dispatch create-promotion event
            this.dispatchEvent(new CustomEvent('create-promotion', {
                bubbles: true,
                composed: true,
                detail: { nftId, nft }
            }));
        }
    }
    
    /**
     * Determines the CSS class for the toggle button
     * @param {Object} nft - The NFT object
     * @returns {string} The CSS class
     * @private
     */
    _getToggleButtonClass(nft) {
        if (!nft.status || nft.status === 'offline') {
            return 'offline';
        }
        return nft.status;
    }
    
    /**
     * Dispatches a show event
     * @param {Object} nft - The NFT to show
     * @private
     */
    _dispatchShowEvent(nft) {
        this.dispatchEvent(new CustomEvent('show-nft', {
            bubbles: true,
            composed: true,
            detail: { nft }
        }));
    }
    
    /**
     * Dispatches an edit event
     * @param {Object} nft - The NFT to edit
     * @private
     */
    _dispatchEditEvent(nft) {
        this.dispatchEvent(new CustomEvent('edit-nft', {
            bubbles: true,
            composed: true,
            detail: { nft }
        }));
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
            // Search in different fields
            return (
                (nft.id && nft.id.toLowerCase().includes(term)) ||
                (nft.type && nft.type.toLowerCase().includes(term)) ||
                (nft.categories && nft.categories.some(cat => 
                    cat.toLowerCase().includes(term)
                ))
            );
        });
        
        // Minimize DOM updates
        if (filteredNFTs.length === 0) {
            this.#tableBody.innerHTML = `
                <tr part="separator-row">
                    <td colspan="5" part="separator-cell"></td>
                </tr>
                <tr part="data-row empty-row">
                    <td colspan="5" part="data-cell empty-message">
                        No results found for "${searchTerm}"
                    </td>
                </tr>
            `;
        } else {
            // Efficiently update only the filtered rows
            const fragment = document.createDocumentFragment();
            
            // Separator row
            const separatorRow = document.createElement('tr');
            separatorRow.setAttribute('part', 'separator-row');
            const separatorCell = document.createElement('td');
            separatorCell.setAttribute('part', 'separator-cell');
            separatorCell.setAttribute('colspan', '5');
            separatorRow.appendChild(separatorCell);
            fragment.appendChild(separatorRow);
            
            // Filtered data rows
            filteredNFTs.forEach((nft, index) => {
                const row = this._createRowElement(nft, index);
                fragment.appendChild(row);
            });
            
            this.#tableBody.innerHTML = '';
            this.#tableBody.appendChild(fragment);
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
            // Update NFT
            this.#nfts[index] = { ...this.#nfts[index], ...updatedNFT };
            
            // Update single row if possible
            const row = this.shadowRoot.querySelector(`tr[data-nft-id="${updatedNFT.id}"]`);
            if (row) {
                const newRow = this._createRowElement(this.#nfts[index], index);
                row.replaceWith(newRow);
            } else {
                // Fallback: Re-render entire table
                this.render();
            }
        }
    }
}

// Register component
customElements.define('nft-table', NFTTable);