import './toggle-button.js';
import './show-button.js';

/**
 * NFTTable Web Component
 * 
 * A customizable table component for displaying NFT data with actions
 * and toggle buttons for status control.
 */
class NFTTable extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.nfts = [];
        
        // Define event handler bindings to properly remove listeners
        this._handleButtonClickBound = this._handleButtonClick.bind(this);
        this._handleToggleEventBound = this._handleToggleEvent.bind(this);
        this._handleOfflineClickBound = this._handleOfflineClick.bind(this);
        this._handleShowActionBound = this._handleShowAction.bind(this);
        this._handleEditActionBound = this._handleEditAction.bind(this);
        
        // Load CSS from external file
        const linkElem = document.createElement('link');
        linkElem.setAttribute('rel', 'stylesheet');
        linkElem.setAttribute('href', 'components/nft-table.css');
        this.shadowRoot.appendChild(linkElem);
        
        // Create table element
        this._table = document.createElement('table');
        this._table.setAttribute('part', 'data-table');
        this.shadowRoot.appendChild(this._table);
    }

    connectedCallback() {
        if (this.hasAttribute('src')) {
            this.loadNFTData();
        } else {
            this.render();
        }
        
        // Add event delegation for all buttons and toggle buttons
        this._addEventListeners();
    }
    
    disconnectedCallback() {
        // Remove event listeners
        this._removeEventListeners();
    }

    static get observedAttributes() {
        return ['src'];
    }

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

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'src' && oldValue !== newValue) {
            this.loadNFTData();
        }
    }

    async loadNFTData() {
        try {
            if (this.src) {
                this.nfts = await this._fetchNFTData(this.src);
                this.render();
            }
        } catch (error) {
            console.error('Error loading NFT data:', error);
            // Render empty table with error message
            this._renderErrorState();
        }
    }

    async _fetchNFTData(src) {
        try {
            const response = await fetch(src);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching NFT data:', error);
            throw error;
        }
    }

    _renderErrorState() {
        this._table.innerHTML = `
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
                <tr part="data-row">
                    <td colspan="5" part="data-cell error-message">
                        Unable to load NFT data. Please try again later.
                    </td>
                </tr>
            </tbody>
            <tfoot part="table-footer">
                <tr>
                    <td colspan="5" part="footer-cell"></td>
                </tr>
            </tfoot>
        `;
    }

    render() {
        this._table.innerHTML = `
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
                ${this._renderRows()}
            </tbody>
            <tfoot part="table-footer">
                <tr>
                    <td colspan="5" part="footer-cell"></td>
                </tr>
            </tfoot>
        `;
    }

    _renderRows() {
        if (!this.nfts || this.nfts.length === 0) {
            return `
                <tr part="data-row">
                    <td colspan="5" part="data-cell empty-message">
                        No NFT data available
                    </td>
                </tr>
            `;
        }

        return this.nfts.map((nft, index) => {
            const idBase = 'nft-' + index;
            const statusClass = this._getToggleButtonClass(nft);
            
            // Verwende jetzt die neue show-button Komponente mit korrektem Tag-Namen
            return `
            <tr id="${idBase}" part="data-row" data-nft-id="${nft.id}">
                <td id="${idBase}-id" part="data-cell">${nft.id || 'N/A'}</td>
                <td id="${idBase}-type" part="data-cell">
                   <div part="content-wrapper">
                        <img src="/img/Arrow-Down-white.png" alt="Arrow Icon" part="content-icon" style="width: 16px; height: 16px;"/>
                        <span part="table-text">${nft.type || 'N/A'}</span>
                    </div>
                </td>
                <td id="${idBase}-topics" part="data-cell">${nft.categories?.join(", ") || 'N/A'}</td>
                <td id="${idBase}-action" part="action-cell">
                    <show-button
                        icon="icon-eye.png"
                        action="show"
                        label="Show Details"
                        item-id="${nft.id}">
                    </show-button>
                    <show-button
                        icon="icon-edit.png"
                        action="edit"
                        label="Edit Promotion"
                        item-id="${nft.id}">
                    </show-button>
                </td>
                <td id="${idBase}-toggle" part="action-cell">
                    <toggle-button status="${statusClass}" offline-text="Create" data-nft-id="${nft.id}" aria-label="Toggle activation status"></toggle-button>
                </td>
            </tr>
            `;
        }).join('');
    }

    _addEventListeners() {
        // Using event delegation for better performance
        this.shadowRoot.addEventListener('click', this._handleButtonClickBound);
        
        // Add event listeners for toggle button events
        this.shadowRoot.addEventListener('toggle', this._handleToggleEventBound);
        this.shadowRoot.addEventListener('offline-click', this._handleOfflineClickBound);
        
        // Add show-button event handlers
        this.shadowRoot.addEventListener('show-action', this._handleShowActionBound);
        this.shadowRoot.addEventListener('edit-action', this._handleEditActionBound);
        
        console.log('Event listeners added to NFT Table');
    }

    _removeEventListeners() {
        this.shadowRoot.removeEventListener('click', this._handleButtonClickBound);
        this.shadowRoot.removeEventListener('toggle', this._handleToggleEventBound);
        this.shadowRoot.removeEventListener('offline-click', this._handleOfflineClickBound);
        this.shadowRoot.removeEventListener('show-action', this._handleShowActionBound);
        this.shadowRoot.removeEventListener('edit-action', this._handleEditActionBound);
    }

    _handleButtonClick(event) {
        console.log('Button click detected', event.target);
        
        // Find closest button if we clicked on child element (like an image)
        const button = event.target.closest('button');
        if (!button) return;
        
        // Skip toggle-button clicks
        if (button.closest('toggle-button')) return;
        
        const action = button.dataset.action;
        const nftId = button.dataset.nftId;
        
        if (!nftId) return;
        
        console.log('Action button clicked:', action, nftId);
        
        const nft = this.nfts.find(item => item.id === nftId);
        if (!nft) return;
        
        if (action === 'show') {
            this._dispatchShowEvent(nft);
        } else if (action === 'edit') {
            this._dispatchEditEvent(nft);
        }
    }
    
    _handleShowAction(event) {
        const { itemId } = event.detail;
        if (!itemId) return;
        
        const nft = this.nfts.find(item => item.id === itemId);
        if (!nft) return;
        
        this._dispatchShowEvent(nft);
    }
    
    _handleEditAction(event) {
        const { itemId } = event.detail;
        if (!itemId) return;
        
        const nft = this.nfts.find(item => item.id === itemId);
        if (!nft) return;
        
        this._dispatchEditEvent(nft);
    }

    _handleToggleEvent(event) {
        console.log('Toggle event received', event);
        
        // Make sure the event comes from a toggle-button inside our shadow DOM
        if (!event.target.matches('toggle-button')) return;
        
        const toggleButton = event.target;
        const nftId = toggleButton.dataset.nftId;
        const status = event.detail.status;
        
        if (!nftId) return;
        
        console.log('Toggle event:', nftId, status);
        
        // Find the NFT and update its status
        const nft = this.nfts.find(item => item.id === nftId);
        if (nft) {
            nft.status = status;
            
            // Dispatch event with status and NFT ID
            this.dispatchEvent(new CustomEvent('toggle-nft-status', {
                bubbles: true,
                composed: true,
                detail: { nftId, status, nft }
            }));
        }
    }

    _handleOfflineClick(event) {
        console.log('Offline click event received', event);
        
        // Make sure the event comes from a toggle-button inside our shadow DOM
        if (!event.target.matches('toggle-button')) return;
        
        const toggleButton = event.target;
        const nftId = toggleButton.dataset.nftId;
        
        if (!nftId) return;
        
        console.log('Offline click for NFT:', nftId);
        
        // Find the NFT
        const nft = this.nfts.find(item => item.id === nftId);
        if (nft) {
            // Dispatch create-promotion event
            this.dispatchEvent(new CustomEvent('create-promotion', {
                bubbles: true,
                composed: true,
                detail: { nftId, nft }
            }));
        }
    }
    
    _getToggleButtonClass(nft) {
        if (!nft.status || nft.status === 'offline') {
            return 'offline';
        }
        return nft.status;
    }
    
    _dispatchShowEvent(nft) {
        this.dispatchEvent(new CustomEvent('show-nft', {
            bubbles: true,
            composed: true,
            detail: { nft }
        }));
    }
    
    _dispatchEditEvent(nft) {
        this.dispatchEvent(new CustomEvent('edit-nft', {
            bubbles: true,
            composed: true,
            detail: { nft }
        }));
    }
}

customElements.define('nft-table', NFTTable);