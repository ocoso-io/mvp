/**
 * NFTTableRow Web Component
 * 
 * Eine Komponente, die eine einzelne Zeile in einer NFT-Tabelle/Grid darstellt.
 * 
 * @element nft-table-row
 * @fires toggle-status - Wird ausgelöst, wenn sich der Status der Toggle-Schaltfläche ändert
 * @fires offline-click - Wird ausgelöst, wenn im Offline-Status auf die Toggle-Schaltfläche geklickt wird
 * 
 * @attr {string} nft-id - Die ID des NFT
 * @attr {string} nft-type - Der Typ des NFT
 * @attr {string} nft-categories - Kommagetrennte Liste von Kategorien
 * @attr {string} nft-status - Der Status des NFT (active, inactive, offline)
 * 
 * @csspart row-container - Der Container der Zeile
 * @csspart cell - Standard-Datenzellen
 * @csspart content-wrapper - Container für Inhalte mit Icons
 * @csspart content-icon - Icons in Zellen
 * @csspart cell-text - Textinhalt in Zellen
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
            
            /* Hover-Effekt für die Zeile */
            :host(:hover) .cell {
                background-color: var(--nft-row-hover-bg, rgba(52, 152, 219, 0.1));
            }
            
            /* Status-spezifische Farben */
            :host([nft-status="active"]) .cell {
                --cell-status-color: var(--nft-active-color, rgba(46, 204, 113, 0.2));
                background-color: var(--cell-status-color);
            }
            
            :host([nft-status="inactive"]) .cell {
                --cell-status-color: var(--nft-inactive-color, rgba(243, 156, 18, 0.2));
                background-color: var(--cell-status-color);
            }
            
            /* Responsives Design - wichtige Änderungen hier */
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
    
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        if (this.#initialized) {
            this._renderData();
        }
    }
    
    /**
     * Initialisiert die Komponente
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
     * Fügt Event-Listener hinzu
     * @private
     */
    _addEventListeners() {
        if (!this.#toggleButton) return;
        
        this.#toggleButton.addEventListener('toggle', this.#boundHandlers.toggleEvent);
        this.#toggleButton.addEventListener('offline-click', this.#boundHandlers.offlineClick);
    }
    
    /**
     * Entfernt Event-Listener
     * @private
     */
    _removeEventListeners() {
        if (!this.#toggleButton) return;
        
        this.#toggleButton.removeEventListener('toggle', this.#boundHandlers.toggleEvent);
        this.#toggleButton.removeEventListener('offline-click', this.#boundHandlers.offlineClick);
    }
    
    /**
     * Handhabt Toggle-Ereignisse von der Toggle-Schaltfläche
     * @param {CustomEvent} event - Das Toggle-Ereignis
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
     * Handhabt Offline-Click-Ereignisse von der Toggle-Schaltfläche
     * @param {CustomEvent} event - Das Offline-Click-Ereignis
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
     * Rendert die Daten in die Zeilenelemente
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
     * Wendet datenbezogene Styling-Änderungen an
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
     * Gibt das NFT-Datenobjekt zurück
     * @return {Object} Das NFT-Datenobjekt
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
     * Setzt das NFT-Datenobjekt und aktualisiert die UI
     * @param {Object} data - Das NFT-Datenobjekt
     */
    set nftData(data) {
        if (!data) return;
        
        this.#nftData = data;
        
        // Update attributes from data
        if (data.id !== undefined) {
            this.setAttribute('nft-id', data.id);
        }
        
        if (data.type !== undefined) {
            this.setAttribute('nft-type', data.type);
        }
        
        if (data.categories !== undefined) {
            const categoriesStr = Array.isArray(data.categories) 
                ? data.categories.join(', ') 
                : data.categories;
            this.setAttribute('nft-categories', categoriesStr);
        }
        
        if (data.status !== undefined) {
            this.setAttribute('nft-status', data.status);
        }
        
        // If already initialized, update the row
        if (this.#initialized) {
            this._renderData();
        }
    }
    
    /**
     * Hebt die Zeile für kurze Zeit hervor
     * @param {string} [highlightColor='rgba(52, 152, 219, 0.4)'] - Die Farbe der Hervorhebung
     * @param {number} [duration=1500] - Die Dauer der Hervorhebung in Millisekunden
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