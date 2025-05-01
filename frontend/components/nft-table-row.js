/**
 * NFTTableRow Web Component
 *
 * A component that represents a single row in an NFT table/grid.
 *
 * @element nft-table-row
 * @fires toggle-status - Fired when the toggle button status changes
 * @fires offline-click - Fired when the toggle button is clicked in offline status
 *
 * @attr {string} nft-id - The ID of the NFT
 * @attr {string} nft-type - The type of the NFT
 * @attr {string} nft-categories - Comma-separated list of categories
 * @attr {string} nft-status - The status of the NFT (active, inactive, offline)
 *
 * @csspart row-container - The row container
 * @csspart cell - Standard data cells
 * @csspart content-wrapper - Container for content with icons
 * @csspart content-icon - Icons in cells
 * @csspart cell-text - Text content in cells
 */
export class NFTTableRow extends HTMLElement {
    // Static template for better performance
    static template = document.createElement('template');
    
    static {
        NFTTableRow.template.innerHTML = `
        <style>
            :host {
                display: contents;
            }
            
            .row-container {
                display: contents;
            }
            
            .cell {
                padding: 12px 16px;
                border-bottom: 1px solid var(--nft-border-color, #444);
            }
            
            .content-wrapper {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .content-icon {
                width: 16px;
                height: 16px;
            }
            
            .action-cell {
                display: flex;
                gap: 8px;
            }
            
            /* Hover effect for the row */
            :host(:hover) .cell {
                background-color: var(--nft-row-hover-bg, rgba(52, 152, 219, 0.1));
            }
            
            /* Status-specific colors */
            :host([nft-status="active"]) .cell {
                --cell-status-color: var(--nft-active-color, rgba(46, 204, 113, 0.2));
                background-color: var(--cell-status-color);
            }
            
            :host([nft-status="inactive"]) .cell {
                --cell-status-color: var(--nft-inactive-color, rgba(243, 156, 18, 0.2));
                background-color: var(--cell-status-color);
            }
            
            /* Responsive design - important changes here */
            @media (max-width: 768px) {
                :host {
                    display: block; /* Wichtig: Ändert das Display-Modell */
                    margin-bottom: 16px;
                    border: 1px solid var(--nft-border-color, #444);
                    border-radius: 4px;
                    overflow: hidden; /* Verhindert, dass border-radius durch Inhalte gebrochen wird */
                }
                
                .row-container {
                    display: block; /* Von contents zu block ändern */
                }
                
                .cell {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px;
                    border-bottom: 1px solid var(--nft-border-color, #444);
                }
                
                .cell:last-child {
                    border-bottom: none; /* Entfernt den letzten Trenner */
                }
                
                .cell::before {
                    content: attr(data-label);
                    font-weight: bold;
                    margin-right: 10px;
                    min-width: 30%; /* Sorgt für konsistente Spaltenbreite der Labels */
                }
                
                /* Besseres Layout für die Action-Zelle auf Mobilgeräten */
                .action-cell {
                    flex-direction: row;
                    flex-wrap: wrap;
                }
            }
        </style>
        
        <div part="row-container" class="row-container">
            <div part="cell" class="cell id-cell" data-label="ID"></div>
            <div part="cell" class="cell type-cell" data-label="Type">
                <div part="content-wrapper" class="content-wrapper">
                    <img src="/img/Arrow-Down-white.png" alt="Arrow Icon" part="content-icon" class="content-icon"/>
                    <span part="cell-text" class="type-text"></span>
                </div>
            </div>
            <div part="cell" class="cell categories-cell" data-label="Topics"></div>
            <div part="cell" class="cell action-cell" data-label="Actions">
                <show-button
                    icon="icon-eye.png"
                    action="show"
                    label="Show Details">
                </show-button>
                <show-button
                    icon="icon-edit.png"
                    action="edit"
                    label="Edit Promotion">
                </show-button>
            </div>
            <div part="cell" class="cell toggle-cell" data-label="Active">
                <toggle-button status="inactive" offline-text="Create" aria-label="Toggle activation status"></toggle-button>
            </div>
        </div>
    `;
}
    
    // Private fields
    #nftData = null;
    #idCell = null;
    #typeText = null;
    #categoriesCell = null;
    #showButton = null;
    #editButton = null;
    #toggleButton = null;
    #rowContainer = null;
    #initialized = false;
    #boundHandlers = {
        toggleEvent: null,
        offlineClick: null
    };
    
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Bind event handlers
        this.#boundHandlers = {
            toggleEvent: this._handleToggleEvent.bind(this),
            offlineClick: this._handleOfflineClick.bind(this)
        };
    }
    
    connectedCallback() {
        if (!this.#initialized) {
            this._initialize();
            this.#initialized = true;
        }
        
        this._addEventListeners();
        this._renderData();
    }
    
    disconnectedCallback() {
        this._removeEventListeners();
    }
    
    static get observedAttributes() {
        return ['nft-id', 'nft-type', 'nft-categories', 'nft-status'];
    }
    
    /**
     * Optimierte attributeChangedCallback für nft-table-row.js
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        // Nur bei Änderungen neu rendern, die UI-Elemente betreffen
        if (this.#initialized) {
            // Nur die spezifischen Elemente aktualisieren statt _renderData() aufzurufen
            switch(name) {
                case 'nft-id':
                    if (this.#idCell) this.#idCell.textContent = newValue || 'N/A';
                    if (this.#showButton) this.#showButton.setAttribute('item-id', newValue);
                    if (this.#editButton) this.#editButton.setAttribute('item-id', newValue);
                    if (this.#toggleButton) this.#toggleButton.dataset.nftId = newValue;
                    this.id = `nft-row-${newValue}`;
                    this.dataset.nftId = newValue;
                    break;
                    
                case 'nft-type':
                    if (this.#typeText) this.#typeText.textContent = newValue || 'N/A';
                    // Stil-Änderungen basierend auf Typ
                    this._applyDataBasedStyling();
                    break;
                    
                case 'nft-categories':
                    if (this.#categoriesCell) this.#categoriesCell.textContent = newValue || '';
                    break;
                    
                case 'nft-status':
                    if (this.#toggleButton) this.#toggleButton.setAttribute('status', newValue || 'offline');
                    // Status-Änderung aktualisiert die Host-Attribut-Klasse automatisch durch den Browser
                    break;
            }
        }
    }
    
    /**
     * Initializes the component
     * @private
     */
    _initialize() {
        // Clone template
        this.shadowRoot.appendChild(NFTTableRow.template.content.cloneNode(true));
        
        // Store DOM references
        this.#rowContainer = this.shadowRoot.querySelector('.row-container');
        this.#idCell = this.shadowRoot.querySelector('.id-cell');
        this.#typeText = this.shadowRoot.querySelector('.type-text');
        this.#categoriesCell = this.shadowRoot.querySelector('.categories-cell');
        this.#showButton = this.shadowRoot.querySelector('show-button[action="show"]');
        this.#editButton = this.shadowRoot.querySelector('show-button[action="edit"]');
        this.#toggleButton = this.shadowRoot.querySelector('toggle-button');
    }
    
    /**
     * Adds event listeners
     * @private
     */
    _addEventListeners() {
        if (!this.#toggleButton) return;
        
        this.#toggleButton.addEventListener('toggle', this.#boundHandlers.toggleEvent);
        this.#toggleButton.addEventListener('offline-click', this.#boundHandlers.offlineClick);
    }
    
    /**
     * Removes event listeners
     * @private
     */
    _removeEventListeners() {
        if (!this.#toggleButton) return;
        
        this.#toggleButton.removeEventListener('toggle', this.#boundHandlers.toggleEvent);
        this.#toggleButton.removeEventListener('offline-click', this.#boundHandlers.offlineClick);
    }
    
    /**
     * Handles toggle events from the toggle button
     * @param {CustomEvent} event - The toggle event
     * @private
     */
    _handleToggleEvent(event) {
        const status = event.detail.status;
        
        // Update attribute
        this.setAttribute('nft-status', status);
        
        // Dispatch status change event
        this.dispatchEvent(new CustomEvent('toggle-status', {
            bubbles: true,
            composed: true,
            detail: { 
                nftId: this.getAttribute('nft-id'),
                status,
                nft: this.nftData
            }
        }));
    }
    
    /**
     * Handles offline click events from the toggle button
     * @param {CustomEvent} event - The offline click event
     * @private
     */
    _handleOfflineClick(event) {
        this.dispatchEvent(new CustomEvent('offline-click', {
            bubbles: true,
            composed: true,
            detail: { 
                nftId: this.getAttribute('nft-id'),
                nft: this.nftData
            }
        }));
    }
    
    /**
     * Renders the data into the row elements
     * @private
     */
    _renderData() {
        if (!this.#rowContainer) return;
        
        const id = this.getAttribute('nft-id') || 'N/A';
        const type = this.getAttribute('nft-type') || 'N/A';
        const categories = this.getAttribute('nft-categories') || '';
        const status = this.getAttribute('nft-status') || 'offline';
        
        // Update ID and data attributes
        this.id = `nft-row-${id}`;
        this.dataset.nftId = id;
        
        // Update cells
        if (this.#idCell) this.#idCell.textContent = id;
        if (this.#typeText) this.#typeText.textContent = type;
        if (this.#categoriesCell) this.#categoriesCell.textContent = categories;
        
        // Update buttons
        if (this.#showButton) this.#showButton.setAttribute('item-id', id);
        if (this.#editButton) this.#editButton.setAttribute('item-id', id);
        if (this.#toggleButton) {
            this.#toggleButton.setAttribute('status', status);
            this.#toggleButton.dataset.nftId = id;
        }
        
        // Apply any additional data-based styling or attributes
        this._applyDataBasedStyling();
    }
    
    /**
     * Applies data-based styling changes
     * @private
     */
    _applyDataBasedStyling() {
        // Beispiel: Füge spezielle Klassen basierend auf NFT-Typ hinzu
        const type = this.getAttribute('nft-type') || '';
        
        if (type.toLowerCase().includes('premium')) {
            this.classList.add('premium-nft');
            this.style.setProperty('--nft-row-hover-bg', 'rgba(155, 89, 182, 0.2)');
        } else {
            this.classList.remove('premium-nft');
            this.style.removeProperty('--nft-row-hover-bg');
        }
    }
    
    /**
     * Returns the NFT data object
     * @return {Object} The NFT data object
     */
    get nftData() {
        if (this.#nftData) return this.#nftData;
        
        // If no data object has been set, construct one from attributes
        return {
            id: this.getAttribute('nft-id'),
            type: this.getAttribute('nft-type'),
            categories: this.getAttribute('nft-categories')?.split(',').map(c => c.trim()) || [],
            status: this.getAttribute('nft-status')
        };
    }
    
    /**
     * Setzt die NFT-Daten und aktualisiert die UI nur bei Änderungen
     * @param {Object} data - Das NFT-Datenobjekt
     */
    set nftData(data) {
        if (!data) return;
        
        const oldData = this.#nftData || {};
        this.#nftData = data;
        
        // Nur Attribute aktualisieren, die sich geändert haben
        if (data.id !== undefined && data.id !== oldData.id) {
            this.setAttribute('nft-id', data.id);
        }
        
        if (data.type !== undefined && data.type !== oldData.type) {
            this.setAttribute('nft-type', data.type);
        }
        
        if (data.categories !== undefined) {
            const newCategories = Array.isArray(data.categories) 
                ? data.categories.join(', ') 
                : data.categories;
        
            const oldCategories = Array.isArray(oldData.categories) 
                ? oldData.categories.join(', ') 
                : oldData.categories || '';
            
            if (newCategories !== oldCategories) {
                this.setAttribute('nft-categories', newCategories);
            }
        }
        
        if (data.status !== undefined && data.status !== oldData.status) {
            this.setAttribute('nft-status', data.status);
        }
        
        // Keine explizite Render-Aufruf hier, da attributeChangedCallback sich darum kümmert
    }
    
    /**
     * Highlights the row for a short duration
     * @param {string} [highlightColor='rgba(52, 152, 219, 0.4)'] - The highlight color
     * @param {number} [duration=1500] - The duration of the highlight in milliseconds
     * @public
     */
    highlight(highlightColor = 'rgba(52, 152, 219, 0.4)', duration = 1500) {
        const cells = this.shadowRoot.querySelectorAll('.cell');
        
        // Speichern der ursprünglichen Hintergrundfarben
        const originalColors = Array.from(cells).map(cell => getComputedStyle(cell).backgroundColor);
        
        // Setzen der Hervorhebungsfarbe
        cells.forEach(cell => {
            cell.style.transition = 'background-color 0.3s ease-in-out';
            cell.style.backgroundColor = highlightColor;
        });
        
        // Zurücksetzen nach der angegebenen Dauer
        setTimeout(() => {
            cells.forEach((cell, index) => {
                cell.style.backgroundColor = originalColors[index];
                
                // Entfernen des Übergangseffekts nach der Animation
                setTimeout(() => {
                    cell.style.transition = '';
                }, 300);
            });
        }, duration);
    }
}

// Komponente registrieren
customElements.define('nft-table-row', NFTTableRow);