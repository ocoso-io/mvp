/**
 * ShowButton Web Component
 * 
 * @element show-button
 * @summary A reusable button component with icon support that can trigger various actions.
 * 
 * @attr {string} icon - Icon file name to display
 * @attr {string} action - Button action type (show, edit, delete, download)
 * @attr {string} label - Text label for accessibility and tooltip
 * @attr {string} item-id - ID of the item this button is associated with
 * @attr {boolean} disabled - Whether the button is disabled
 * @attr {string} formaction - Form action URL when used in a form context
 * 
 * @fires show-action - When a show action is triggered
 * @fires edit-action - When an edit action is triggered
 * @fires delete-action - When a delete action is triggered
 * @fires download-action - When a download action is triggered
 * 
 * @csspart button - The button element
 * @csspart icon - The icon image element
 * 
 * @cssproperty --show-color - Color for show action buttons
 * @cssproperty --edit-color - Color for edit action buttons
 * @cssproperty --delete-color - Color for delete action buttons
 * @cssproperty --download-color - Color for download action buttons
 * @cssproperty --focus-color - Color for focus outline
 */
class ShowButton extends HTMLElement {
    // Static constants
    static DEFAULT_ICON = 'icon-eye.png';
    static DEFAULT_ACTION = 'show';
    static DEFAULT_LABEL = 'Show Details';
    static FALLBACK_ICON = 'icon-fallback.png';
    static ACTIONS = ['show', 'edit', 'delete', 'download'];
    static iconBasePath = '/img/';
    static formAssociated = true;

    // Private class fields
    #button;
    #imgElement;
    #icon = ShowButton.DEFAULT_ICON;
    #action = ShowButton.DEFAULT_ACTION;
    #label = ShowButton.DEFAULT_LABEL;
    #itemId = '';
    #handleClickBound;
    _pendingUpdate = false;
    _internals = null;

    // Static template for better performance
    static template = document.createElement('template');
    
    static {
        // Initialize the template once for all instances
        ShowButton.template.innerHTML = `
            <style>
                /* Define all CSS variables with default values */
                :host {
                    display: inline-block;
                    
                    /* Define all CSS variables with default values */
                    --show-color: #4a90e2;
                    --edit-color: #f5a623;
                    --delete-color: #e74c3c;
                    --download-color: #2ecc71;
                    --focus-color: #4a90e2;
                    
                    /* Dark mode variables */
                    --show-color-dark: #5f9ee8;
                    --edit-color-dark: #f9bc4d;
                    --delete-color-dark: #e95e52;
                    --download-color-dark: #43d37e;
                    --focus-color-dark: #5f9ee8;
                }
                
                button {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    margin: 0;
                    transition: transform 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    will-change: transform;
                }
                
                button:hover {
                    transform: scale(1.1);
                }
                
                button:active {
                    transform: scale(0.95);
                }
                
                button:focus {
                    outline: 2px solid var(--focus-color);
                    outline-offset: 2px;
                }
                
                img {
                    width: 20px;
                    height: 20px;
                    display: block;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }
                
                img.loaded {
                    opacity: 1;
                }
                
                .tooltip {
                    position: relative;
                }
                
                .tooltip::after {
                    content: attr(data-tooltip);
                    position: absolute;
                    bottom: -30px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                }
                
                .tooltip:hover::after {
                    opacity: 1;
                }
                
                /* Use the defined variables without fallbacks since they're defined in :host */
                :host([action="show"]) button { color: var(--show-color); }
                :host([action="edit"]) button { color: var(--edit-color); }
                :host([action="delete"]) button { color: var(--delete-color); }
                :host([action="download"]) button { color: var(--download-color); }
                
                :host([disabled]) button {
                    cursor: not-allowed;
                    opacity: 0.5;
                }
                
                :host([disabled]) button:hover {
                    transform: none;
                }
                
                /* Theme support */
                @media (prefers-color-scheme: dark) {
                    :host {
                        --show-color: var(--show-color-dark);
                        --edit-color: var(--edit-color-dark);
                        --delete-color: var(--delete-color-dark);
                        --download-color: var(--download-color-dark);
                        --focus-color: var(--focus-color-dark);
                    }
                }
            </style>
            <button part="button" role="button" tabindex="0">
                <img part="icon" alt="Show Details" src="" loading="lazy">
                <slot></slot>
            </button>
        `;
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Form-associated support
        if ('attachInternals' in this) {
            this._internals = this.attachInternals();
        }
        
        // Check for custom icon base path
        const metaIconPath = document.querySelector('meta[name="icon-base-path"]');
        if (metaIconPath && metaIconPath.content) {
            ShowButton.iconBasePath = metaIconPath.content;
        }
        
        // Clone the template content into the shadow DOM
        this.shadowRoot.appendChild(
            ShowButton.template.content.cloneNode(true)
        );
        
        // Get references to elements
        this.#button = this.shadowRoot.querySelector('button');
        this.#imgElement = this.shadowRoot.querySelector('img');
        
        // Bind event handlers
        this.#handleClickBound = this.#handleClick.bind(this);
        
        // Add keyboard event support
        this.#button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.#handleClick(e);
            }
        });
    }

    static get observedAttributes() {
        return ['icon', 'action', 'label', 'item-id', 'disabled', 'formaction'];
    }

    connectedCallback() {
        this.#updateFromAttributes();
        this.#button.addEventListener('click', this.#handleClickBound);
        
        // If in the context of a form
        if (this._internals && this._internals.form) {
            this.#button.setAttribute('form', this._internals.form.id);
        }
    }

    disconnectedCallback() {
        this.#button.removeEventListener('click', this.#handleClickBound);
        
        // Clean up image event handlers
        if (this.#imgElement) {
            this.#imgElement.onload = null;
            this.#imgElement.onerror = null;
        }
        
        // Clear references
        this.#handleClickBound = null;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        // Batch DOM updates for multiple attribute changes
        if (!this._pendingUpdate) {
            this._pendingUpdate = true;
            
            // Use microtask to batch multiple attribute changes in same tick
            queueMicrotask(() => {
                this._pendingUpdate = false;
                this.#updateFromAttributes();
            });
        }
        
        // Update properties immediately
        switch (name) {
            case 'icon':
                this.#icon = newValue || ShowButton.DEFAULT_ICON;
                break;
            case 'action':
                this.#action = ShowButton.ACTIONS.includes(newValue) ? 
                    newValue : ShowButton.DEFAULT_ACTION;
                break;
            case 'label':
                this.#label = newValue || ShowButton.DEFAULT_LABEL;
                break;
            case 'item-id':
                this.#itemId = newValue || '';
                break;
        }
    }
    
    // Public API: getters and setters
    get icon() { return this.#icon; }
    set icon(value) {
        if (value && typeof value === 'string') {
            this.setAttribute('icon', value);
        } else {
            console.warn(`Invalid icon: ${value}. Using default: ${ShowButton.DEFAULT_ICON}`);
            this.setAttribute('icon', ShowButton.DEFAULT_ICON);
        }
    }
    
    get action() { return this.#action; }
    set action(value) {
        if (ShowButton.ACTIONS.includes(value)) {
            this.setAttribute('action', value);
        } else {
            console.warn(`Invalid action: ${value}. Using default: ${ShowButton.DEFAULT_ACTION}`);
            this.setAttribute('action', ShowButton.DEFAULT_ACTION);
        }
    }
    
    get label() { return this.#label; }
    set label(value) { this.setAttribute('label', value || ShowButton.DEFAULT_LABEL); }
    
    get itemId() { return this.#itemId; }
    set itemId(value) { this.setAttribute('item-id', value || ''); }
    
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(value) {
        this.toggleAttribute('disabled', Boolean(value));
    }
    
    get iconPath() {
        return ShowButton.iconBasePath;
    }
    
    // Form-associated API
    get form() { return this._internals ? this._internals.form : null; }
    get name() { return this.getAttribute('name'); }
    set name(value) { this.setAttribute('name', value); }

    // Private methods
    #updateFromAttributes() {
        if (!this.#button || !this.#imgElement) return;

        // Update image with lazy loading
        const iconSrc = `${ShowButton.iconBasePath}${this.#icon}`;
        if (this.#imgElement.src !== iconSrc) {
            this.#imgElement.classList.remove('loaded');
            this.#imgElement.src = iconSrc;
            this.#imgElement.alt = this.#label;
            
            this.#imgElement.onload = () => {
                this.#imgElement.classList.add('loaded');
            };
            
            this.#imgElement.onerror = () => {
                console.warn(`Failed to load icon: ${this.#icon}`);
                this.#imgElement.src = `${ShowButton.iconBasePath}${ShowButton.FALLBACK_ICON}`;
            };
        }
        
        // Update button attributes
        this.#updateButtonAttributes();
    }

    #updateButtonAttributes() {
        if (!this.#button) return;
        
        // Update all attributes at once - simplified approach
        this.#button.setAttribute('aria-label', this.#label);
        this.#button.dataset.tooltip = this.#label;
        this.#button.dataset.action = this.#action;
        this.#button.dataset.itemId = this.#itemId;
        this.#button.disabled = this.hasAttribute('disabled');
        this.#button.className = this.#action === 'show' ? 'tooltip' : '';
    }

    #handleClick(event) {
        if (this.hasAttribute('disabled')) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        
        // Form support
        if (this._internals && this._internals.form && this.hasAttribute('formaction')) {
            const formAction = this.getAttribute('formaction');
            if (formAction) {
                this._internals.form.action = formAction;
            }
        }
        
        // Create a custom event with relevant data
        const actionEvent = new CustomEvent(`${this.#action}-action`, {
            bubbles: true,
            composed: true,
            detail: {
                action: this.#action,
                itemId: this.#itemId,
                source: this,
                originalEvent: event  // Include original event for more context
            }
        });
        
        // Dispatch the event
        this.dispatchEvent(actionEvent);
    }
}

// Export the class for use with ES Modules
export default ShowButton;

// Register the component
customElements.define('show-button', ShowButton);