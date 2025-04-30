/**
 * PromotionInfoBox Web Component
 * 
 * A modal component that displays detailed information about an NFT promotion
 * with action buttons for confirming or canceling operations.
 */
class PromotionInfoBox extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this._visible = false;
        this._nftData = null;
        
        // Create container
        this._createContainer();
    }
    
    _createContainer() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                --box-width: var(--px-400, 400px);
                --box-height: var(--px-350, 350px);
                --box-bg-color: rgba(20, 20, 20, 0.90);
                --box-padding: var(--px-20, 20px);
                --box-radius: 8px;
                --box-shadow: 0 var(--px-2, 2px) var(--px-10, 10px) rgba(0, 0, 0, 0.8);
                --highlight-color: #82d616;
            }
            
            .overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(3px);
                display: none;
                z-index: 9999;
            }
            
            .overlay.visible {
                display: block;
            }
            
            .promo-box {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10000;
                background: var(--box-bg-color);
                backdrop-filter: blur(5px);
                color: #fff;
                padding: var(--box-padding);
                border-radius: var(--box-radius);
                box-shadow: var(--box-shadow);
                width: var(--box-width);
                height: var(--box-height);
                max-width: 90vw;
                max-height: 90vh;
                overflow: auto;
                display: none;
                font-family: var(--main-font-family, sans-serif);
            }
            
            .promo-box.visible {
                display: block;
            }
            
            .close-button {
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                color: #fff;
                font-size: 24px;
                cursor: pointer;
            }
            
            .promo-content {
                margin-top: 20px;
            }
            
            h2 {
                margin-top: 0;
                color: #fff;
                font-size: 1.5rem;
            }
            
            .promo-info {
                margin: 20px 0;
            }
            
            .promo-info p {
                margin: 10px 0;
            }
            
            .promo-info strong {
                display: inline-block;
                width: 80px;
            }
            
            .action-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }
            
            .action-button {
                background-color: #000;
                color: #fff;
                border: 1px solid #fff;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-family: inherit;
                min-width: 80px;
                text-transform: uppercase;
                font-size: 14px;
                transition: background-color 0.2s, transform 0.1s;
            }
            
            .action-button:hover {
                background-color: #333;
            }
            
            .action-button:active {
                transform: scale(0.98);
            }
            
            .action-button.primary {
                background-color: var(--highlight-color, #82d616);
                color: #000;
                border: none;
                font-weight: bold;
            }
            
            .action-button.primary:hover {
                background-color: #6bc211;
            }
            
            .status-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                text-transform: uppercase;
                font-size: 12px;
                font-weight: bold;
            }
            
            .status-badge.active {
                background-color: var(--highlight-color, #82d616);
                color: #000;
            }
            
            .status-badge.inactive {
                background-color: #adb5bd;
                color: #000;
            }
            
            .status-badge.offline {
                background-color: #adb5bd;
                color: #000;
            }
        `;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        
        // Create modal container
        const container = document.createElement('div');
        container.className = 'promo-box';
        container.innerHTML = `
            <button class="close-button" aria-label="Close">&times;</button>
            <div class="promo-content">
                <h2>Promotion Details</h2>
                <div class="promo-info"></div>
                <div class="action-buttons">
                    <button class="action-button cancel">Cancel</button>
                    <button class="action-button primary confirm">Confirm</button>
                </div>
            </div>
        `;
        
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(overlay);
        this.shadowRoot.appendChild(container);
        
        // Event listeners for buttons
        const closeButton = this.shadowRoot.querySelector('.close-button');
        const cancelButton = this.shadowRoot.querySelector('.cancel');
        const confirmButton = this.shadowRoot.querySelector('.confirm');
        
        closeButton.addEventListener('click', () => this.hide());
        cancelButton.addEventListener('click', () => this.hide());
        confirmButton.addEventListener('click', this._handleConfirm.bind(this));
        overlay.addEventListener('click', () => this.hide());
        
        this._overlay = overlay;
        this._container = container;
        this._contentDiv = this.shadowRoot.querySelector('.promo-info');
    }
    
    get visible() {
        return this._visible;
    }
    
    set visible(value) {
        this._visible = Boolean(value);
        if (this._visible) {
            this._container.classList.add('visible');
            this._overlay.classList.add('visible');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        } else {
            this._container.classList.remove('visible');
            this._overlay.classList.remove('visible');
            document.body.style.overflow = ''; // Allow scrolling
        }
    }
    
    show(nftData) {
        this._nftData = nftData;
        this._updateContent();
        this.visible = true;
    }
    
    hide() {
        this.visible = false;
    }
    
    _updateContent() {
        if (!this._nftData) {
            this._contentDiv.innerHTML = '<p>No data available</p>';
            return;
        }
        
        const { id, type, categories, status } = this._nftData;
        const statusClass = status?.trim() || 'offline';
        
        this._contentDiv.innerHTML = `
            <p><strong>ID:</strong> ${id || 'N/A'}</p>
            <p><strong>Type:</strong> ${type || 'N/A'}</p>
            <p><strong>Topics:</strong> ${categories?.join(", ") || 'N/A'}</p>
            <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${status || 'offline'}</span></p>
        `;
    }
    
    _handleConfirm() {
        this.dispatchEvent(new CustomEvent('confirm-promotion', {
            bubbles: true,
            composed: true,
            detail: { nft: this._nftData }
        }));
        
        this.hide();
    }
}

customElements.define('promotion-info-box', PromotionInfoBox);