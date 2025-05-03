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
 * @fires nft-added - Fired when an NFT is added to the table
 * @fires nft-removed - Fired when an NFT is removed from the table
 * @fires nfts-cleared - Fired when all NFTs are cleared from the table
 *
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
                
                /* Responsive Design */
                @media (max-width: 768px) {
                    .data-grid {
                        display: block;
                    }
                    
                    .grid-header {
                        display: none;
                    }
                    
                    .grid-body {
                        display: block;
                    }
                    
                    .separator {
                        display: none;
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
    #dataProvider = null;  // External service for handling data operations
    #statusMapper = null;  // External service for handling status mapping
    #grid = null;
    #gridBody = null;
    #loadingContainer = null;
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
            retryClick: this._handleRetryClick.bind(this)
        };
    }

    connectedCallback() {
        if (!this.#initialized) {
            this._initialize();
        }
        
        this._addEventListeners();
    }
    
    disconnectedCallback() {
        this._removeEventListeners();
    }

    static get observedAttributes() {
        return ['loading'];
    }

    // Getters and setters
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
    
    get dataProvider() {
        return this.#dataProvider;
    }
    
    set dataProvider(provider) {
        if (typeof provider !== 'object' || provider === null) {
            throw new Error('Data provider must be an object with the required methods');
        }
        
        // Check for required methods
        const requiredMethods = ['getData', 'getItem', 'addItem', 'updateItem', 'removeItem'];
        const missingMethods = requiredMethods.filter(method => typeof provider[method] !== 'function');
        
        if (missingMethods.length > 0) {
            throw new Error(`Data provider is missing required methods: ${missingMethods.join(', ')}`);
        }
        
        // Remove old event listeners if any
        if (this.#dataProvider && typeof this.#dataProvider.removeEventListener === 'function') {
            this.#dataProvider.removeEventListener('data-changed', this.render.bind(this));
        }
        
        this.#dataProvider = provider;
        
        // Set up event listeners for the provider
        if (typeof provider.addEventListener === 'function') {
            // Hier die Änderung: Action-Parameter aus dem Event extrahieren
            provider.addEventListener('data-changed', (event) => {
                const action = event.detail?.action;
                this.render(action);
            });
            
            // Setup specific event listeners
            if (typeof provider.onSpecificChange === 'function') {
                provider.onSpecificChange('item-added', (event) => {
                    this._handleItemAdded(event.detail);
                });
                
                provider.onSpecificChange('item-updated', (event) => {
                    this._handleItemUpdated(event.detail);
                });
                
                provider.onSpecificChange('item-removed', (event) => {
                    this._handleItemRemoved(event.detail);
                });
            }
        }
        
        // Initial render
        this.render();
    }
    
    get statusMapper() {
        return this.#statusMapper;
    }
    
    set statusMapper(mapper) {
        if (typeof mapper !== 'object' || mapper === null || typeof mapper.getStatusClass !== 'function') {
            throw new Error('Status mapper must be an object with a getStatusClass method');
        }
        
        this.#statusMapper = mapper;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        switch (name) {
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
        
        // Default status mapper if none is provided
        if (!this.#statusMapper) {
            this.#statusMapper = {
                getStatusClass: (nft) => {
                    if (!nft.status || nft.status === 'offline') {
                        return 'offline';
                    }
                    return nft.status;
                }
            };
        }
        
        // Set initialization status
        this.#initialized = true;
    }

    /**
     * Handles retry button clicks
     * @private
     */
    _handleRetryClick() {
        if (this.#dataProvider && typeof this.#dataProvider.reload === 'function') {
            this.loading = true;
            this._renderLoadingState();
            this.#dataProvider.reload()
                .catch(error => {
                    this._renderErrorState(error.message);
                })
                .finally(() => {
                    this.loading = false;
                });
        }
    }

    /**
     * Renders a loading state
     * @private
     */
    _renderLoadingState() {
        if (!this.#gridBody) return;
        
        this.#gridBody.innerHTML = `
            <div part="separator" class="separator"></div>
            <div part="loading-message" class="loading-message">
                <slot name="loading-text">Loading NFT data...</slot>
            </div>
        `;
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
     * Renders the empty state
     * @private
     */
    _renderEmptyState() {
        if (!this.#gridBody) return;
        
        const emptyMessage = document.createElement('div');
        emptyMessage.setAttribute('part', 'empty-message');
        emptyMessage.classList.add('empty-message');
        emptyMessage.innerHTML = '<slot name="empty-text">No NFT data available</slot>';
        
        this.#gridBody.appendChild(emptyMessage);
    }

    /**
     * Creates a row element for an NFT
     * @param {Object} nft - The NFT data 
     * @returns {HTMLElement} The created row element
     * @private
     */
    _createRowElement(nft) {
        const rowElement = document.createElement('nft-table-row');
        
        // Set data through attributes
        rowElement.setAttribute('nft-id', nft.id || '');
        rowElement.setAttribute('nft-type', nft.type || '');
        rowElement.setAttribute('nft-categories', nft.categories?.join(', ') || '');
        rowElement.setAttribute('nft-status', this.#statusMapper.getStatusClass(nft));
        
        // Set the full data object
        rowElement.nftData = nft;
        
        // Add event listeners
        rowElement.addEventListener('toggle-status', this.#boundHandlers.rowToggleStatus);
        rowElement.addEventListener('offline-click', this.#boundHandlers.rowOfflineClick);
        
        return rowElement;
    }

    /**
     * Alte render-Methode umbenennen und als Fallback-Methode behalten
     */
    _renderAllRows() {
        if (!this.#gridBody || !this.#dataProvider) return;
        
        const data = this.#dataProvider.getData();
        
        // Clear grid body except for separator
        this.#gridBody.innerHTML = `
            <div part="separator" class="separator"></div>
        `;
        
        if (!data || data.length === 0) {
            this._renderEmptyState();
            return;
        }
        
        // Batch DOM updates with DocumentFragment
        const fragment = document.createDocumentFragment();
        
        // Render NFT rows using the NFTTableRow component
        data.forEach(nft => {
            fragment.appendChild(this._createRowElement(nft));
        });
        
        // Append all rows at once
        this.#gridBody.appendChild(fragment);
    }

    /**
     * Neue optimierte render-Methode
     * Prüft, ob eine vollständige Neuerstellung nötig ist
     */
    render(action = null) {
        // Wenn kein Action-Parameter übergeben wurde, oder die Action ist 'load' oder 'clear',
        // dann vollständiges Rendering durchführen
        if (!action || action === 'load' || action === 'clear') {
            this._renderAllRows();
            return;
        }
        
        // Für andere Aktionen (add, update, remove) werden die spezifischen Handler verwendet,
        // die bereits implementiert sind
        // Diese Methode tut nichts, wenn sie von data-changed mit 'update' aufgerufen wird,
        // da der spezifische Handler _handleItemUpdated bereits zuständig ist
    }
    
    /**
     * Helper method to dispatch custom events with consistent properties
     * @param {string} eventName - The name of the event to dispatch
     * @param {Object} detail - The detail object for the event
     * @private
     */
    _dispatchDataEvent(eventName, detail) {
        this.dispatchEvent(new CustomEvent(eventName, {
            bubbles: true,
            composed: true,
            detail
        }));
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
        
        // Remove data provider listener if it exists
        if (this.#dataProvider && typeof this.#dataProvider.removeEventListener === 'function') {
            this.#dataProvider.removeEventListener('data-changed', this.render.bind(this));
        }
    }
    
    /**
     * Handles toggle-status events from row components
     * @param {CustomEvent} event - The toggle-status event
     * @private
     */
    _handleRowToggleStatus(event) {
        const { nftId, status, nft } = event.detail;
        
        if (this.#dataProvider) {
            // Get the current item
            const currentNft = this.#dataProvider.getItem(nftId);
            
            if (currentNft) {
                // Nur das Status-Feld aktualisieren anstatt der gesamten NFT-Daten
                // Das verhindert, dass data-changed einen vollständigen Neuaufbau auslöst
                const updatedNft = { 
                    id: nftId,
                    status
                };
                
                // Update in the data provider, aber ohne die komplette render() auszulösen
                this.#dataProvider.updateItem(updatedNft);
                
                // Forward the event
                this._dispatchDataEvent('toggle-nft-status', { 
                    nftId, 
                    status, 
                    nft: {...currentNft, status}
                });
            }
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
        this._dispatchDataEvent('create-promotion', { nftId, nft });
    }
    
    /**
     * Handles show-action events
     * @param {CustomEvent} event - The show-action event
     * @private
     */
    _handleShowAction(event) {
        const { itemId } = event.detail;
        if (!itemId || !this.#dataProvider) return;
        
        const nft = this.#dataProvider.getItem(itemId);
        if (!nft) return;
        
        this._dispatchDataEvent('show-nft', { nft });
    }
    
    /**
     * Handles edit-action events
     * @param {CustomEvent} event - The edit-action event
     * @private
     */
    _handleEditAction(event) {
        const { itemId } = event.detail;
        if (!itemId || !this.#dataProvider) return;
        
        const nft = this.#dataProvider.getItem(itemId);
        if (!nft) return;
        
        this._dispatchDataEvent('edit-nft', { nft });
    }

    /**
     * Handles item-added event - Adds a single row without rerendering the whole table
     * @param {Object} detail - Event detail with item data
     * @private
     */
    _handleItemAdded(detail) {
        if (!this.#gridBody || !detail.item) return;
        
        // Check if we need to remove the empty state message
        const emptyMessage = this.#gridBody.querySelector('.empty-message');
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        // Create and append the new row
        const rowElement = this._createRowElement(detail.item);
        this.#gridBody.appendChild(rowElement);
    }

    /**
     * Handles item-updated event - Updates a specific row without rerendering the whole table
     * @param {Object} detail - Event detail with updated item data
     * @private
     */
    _handleItemUpdated(detail) {
        if (!this.#gridBody || !detail.item || !detail.id) return;
        
        // Find the row with this NFT ID
        const rowElement = this.#gridBody.querySelector(`nft-table-row[nft-id="${detail.id}"]`);
        if (!rowElement) return;
        
        // Update the row's attributes
        rowElement.setAttribute('nft-type', detail.item.type || '');
        rowElement.setAttribute('nft-categories', detail.item.categories?.join(', ') || '');
        rowElement.setAttribute('nft-status', this.#statusMapper.getStatusClass(detail.item));
        
        // Update the full data object
        rowElement.nftData = detail.item;
    }

    /**
     * Handles item-removed event - Removes a specific row without rerendering the whole table
     * @param {Object} detail - Event detail with removed item data
     * @private
     */
    _handleItemRemoved(detail) {
        if (!this.#gridBody || !detail.id) return;
        
        // Find and remove the row with this NFT ID
        const rowElement = this.#gridBody.querySelector(`nft-table-row[nft-id="${detail.id}"]`);
        if (rowElement) {
            rowElement.remove();
        }
        
        // Check if we need to show the empty state
        const rows = this.#gridBody.querySelectorAll('nft-table-row');
        if (rows.length === 0) {
            this._renderEmptyState();
        }
    }
}

// Register component
customElements.define('nft-table', NFTTable);