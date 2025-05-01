/**
 * Represents a customizable toggle button element that extends the base `HTMLElement`.
 * This component provides three states: active, inactive, and offline, with respective
 * visual feedback and accessibility attributes. It emits custom events when toggled
 * or clicked while in the offline state.
 *
 * @element toggle-button
 * @fires toggle - Fired when the button's state changes between `active` and `inactive`
 * @fires offline-click - Fired when the button is clicked while in the `offline` state
 * 
 * @attr {string} status - Current state: 'active', 'inactive', or 'offline'
 * @attr {string} offline-text - Text displayed when in the offline state
 * 
 * @csspart button - The toggle button element
 * @csspart indicator - The indicator element
 * @csspart text-label - The text label for the offline state
 * 
 * @cssproperty --toggle-active-color - Background color when toggle is active
 * @cssproperty --toggle-inactive-color - Background color when toggle is inactive
 * @cssproperty --toggle-offline-color - Background color when toggle is offline
 * @cssproperty --toggle-indicator-color - Color of the toggle indicator
 * @cssproperty --toggle-indicator-size - Size of the toggle indicator
 * @cssproperty --focus-color - Color of the focus outline
 * @cssproperty --toggle-button-width - Width of the toggle button
 * @cssproperty --toggle-button-height - Height of the toggle button
 * @cssproperty --toggle-button-radius - Border radius of the toggle button
 */
export class ToggleButton extends HTMLElement {
    // Static constants
    static VALID_STATUSES = ['active', 'inactive', 'offline'];
    static DEFAULT_STATUS = 'inactive';
    static DEFAULT_OFFLINE_TEXT = 'OFF';
    static formAssociated = true;

    // Private fields
    #button = null;
    #textLabel = null;
    #status = ToggleButton.DEFAULT_STATUS;
    #pendingUpdate = false;
    #handleClickBound = null;
    #handleKeydownBound = null;
    #internals = null;

    // Static template for better performance
    static template = document.createElement('template');
    
    static {
        // Initialize the template once for all instances
        ToggleButton.template.innerHTML = `
            <style>
                :host {
                    --toggle-active-color: #82d616;
                    --toggle-inactive-color: #adb5bd;
                    --toggle-offline-color: #adb5bd;
                    --toggle-border: 0.0625rem;
                    --toggle-button-width: 3.125rem;
                    --toggle-button-height: 1.5625rem;
                    --toggle-button-radius: 0.8125rem;
                    --toggle-indicator-color: #000;
                    --toggle-indicator-size: 0.9375rem;
                    --toggle-indicator-font-weight: bold;
                    --toggle-indicator-font-size: 0.75rem;
                    --toggle-indicator-text-transform: uppercase;
                    --toggle-indicator-text-align: center;
                    --px-3: 0.1875rem;
                    --focus-color: #4a90e2;
                    display: inline-block;
                }
                
                button {
                    width: var(--toggle-button-width);
                    height: var(--toggle-button-height);
                    border-radius: var(--toggle-button-radius);
                    border: none;
                    padding: var(--px-3);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    transition: background-color 0.3s ease, border-color 0.3s ease;
                    position: relative;
                }
                
                button:focus {
                    outline: 2px solid var(--focus-color);
                    outline-offset: 2px;
                }
                
                button:active .indicator {
                    transform: scale(0.9);
                }
                
                .content-container {
                    display: flex;
                    width: 100%;
                    height: 100%;
                    align-items: center;
                    justify-content: center;
                    transition: justify-content 0.3s ease;
                }
                
                button.active {
                    background-color: var(--toggle-active-color);
                    border: var(--toggle-border) solid var(--toggle-active-color);
                }
                
                button.active .content-container {
                    justify-content: flex-end;
                }
                
                button.inactive {
                    background-color: var(--toggle-inactive-color);
                    border: var(--toggle-border) solid var(--toggle-inactive-color);
                }
                
                button.inactive .content-container {
                    justify-content: flex-start;
                }
                
                button.offline {
                    background-color: var(--toggle-offline-color);
                    border: var(--toggle-border) solid var(--toggle-offline-color);
                    cursor: pointer;
                }
                
                button.offline .content-container {
                    justify-content: center;
                }
                
                .indicator {
                    width: var(--toggle-indicator-size);
                    height: var(--toggle-indicator-size);
                    background-color: var(--toggle-indicator-color);
                    border-radius: 50%;
                    display: block;
                    box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
                    transition: transform 0.3s ease;
                    will-change: transform;
                }
                
                .text-label {
                    display: none;
                    color: var(--toggle-indicator-color);
                    font-size: var(--toggle-indicator-font-size);
                    font-weight: var(--toggle-indicator-font-weight);
                    text-transform: var(--toggle-indicator-text-transform);
                    text-align: var(--toggle-indicator-text-align);
                }
                
                button.offline .indicator {
                    display: none;
                }
                
                button.offline .text-label {
                    display: block;
                }
                
                /* High contrast mode support */
                @media (forced-colors: active) {
                    .indicator {
                        border: 1px solid ButtonText;
                    }
                    button {
                        border: 1px solid ButtonText;
                    }
                }
                
                /* Reduced motion support */
                @media (prefers-reduced-motion: reduce) {
                    button,
                    .indicator,
                    .content-container {
                        transition: none;
                    }
                }
                
                /* User agent touch targets */
                @media (pointer: coarse) {
                    button {
                        min-height: 44px;
                        min-width: 44px;
                    }
                }
            </style>
            <button part="button" role="switch" tabindex="0">
                <div class="content-container">
                    <span part="indicator" class="indicator"></span>
                    <span part="text-label" class="text-label"></span>
                </div>
            </button>
        `;
    }

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        
        // Enable form association if supported
        if ('attachInternals' in this) {
            this.#internals = this.attachInternals();
        }
        
        // Bind event handlers once
        this.#handleClickBound = this._handleClick.bind(this);
        this.#handleKeydownBound = this._handleKeydown.bind(this);
    }

    connectedCallback() {
        // Lazy initialization of DOM
        if (!this.#button) {
            this._createInitialDOM();
        }
        
        // Initial status check and application
        if (!this.hasAttribute('status')) {
            this.status = ToggleButton.DEFAULT_STATUS;
        } else {
            const attributeValue = this.getAttribute('status');
            if (!ToggleButton.VALID_STATUSES.includes(attributeValue)) {
                console.warn(`Invalid status value: ${attributeValue}. Using default: ${ToggleButton.DEFAULT_STATUS}`);
                this.status = ToggleButton.DEFAULT_STATUS;
            } else {
                this.#status = attributeValue;
                this._updateUI();
            }
        }
        
        // Set offline text if provided
        if (this.hasAttribute('offline-text')) {
            this.#textLabel.textContent = this.getAttribute('offline-text');
        } else {
            this.#textLabel.textContent = ToggleButton.DEFAULT_OFFLINE_TEXT;
        }
        
        // Add event listeners
        this.#button.addEventListener('click', this.#handleClickBound);
        this.#button.addEventListener('keydown', this.#handleKeydownBound);
    }

    disconnectedCallback() {
        if (this.#button) {
            this.#button.removeEventListener('click', this.#handleClickBound);
            this.#button.removeEventListener('keydown', this.#handleKeydownBound);
        }
    }

    adoptedCallback() {
        this._updateUI();
    }

    static get observedAttributes() {
        return ['status', 'offline-text'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        // Batch DOM updates for multiple attribute changes
        if (!this.#pendingUpdate) {
            this.#pendingUpdate = true;
            
            // Use microtask to batch multiple attribute changes in same tick
            queueMicrotask(() => {
                this.#pendingUpdate = false;
                if (this.isConnected) {
                    this._updateUI();
                }
            });
        }
        
        // Update properties immediately
        switch (name) {
            case 'status':
                if (ToggleButton.VALID_STATUSES.includes(newValue)) {
                    this.#status = newValue;
                } else {
                    console.warn(`Invalid status value: ${newValue}. Using default: ${ToggleButton.DEFAULT_STATUS}`);
                    this.#status = ToggleButton.DEFAULT_STATUS;
                    if (this.getAttribute('status') !== ToggleButton.DEFAULT_STATUS) {
                        this.setAttribute('status', ToggleButton.DEFAULT_STATUS);
                    }
                }
                break;
            case 'offline-text':
                if (this.#textLabel) {
                    this.#textLabel.textContent = newValue || ToggleButton.DEFAULT_OFFLINE_TEXT;
                }
                break;
        }
    }

    /**
     * Creates the initial DOM structure by cloning the template
     * @private
     */
    _createInitialDOM() {
        // Clone template for better performance
        this.shadowRoot.appendChild(
            ToggleButton.template.content.cloneNode(true)
        );
        
        // Store references
        this.#button = this.shadowRoot.querySelector('button');
        this.#textLabel = this.shadowRoot.querySelector('.text-label');
    }
    
    /**
     * Handles keyboard events for accessibility
     * @private
     * @param {KeyboardEvent} event - The keyboard event
     */
    _handleKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this._handleClick(event);
        }
    }

    /**
     * Handles click events on the toggle button
     * @private
     * @param {Event} event - The click event
     */
    _handleClick(event) {
        if (this.hasAttribute('disabled')) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        
        if (this.status === 'offline') {
            // For offline status, only trigger an event but don't change status
            this.dispatchEvent(new CustomEvent('offline-click', {
                bubbles: true,
                composed: true,
                detail: {status: this.status}
            }));
            return;
        }

        // Normal status toggle for active/inactive
        this.status = this.status === 'active' ? 'inactive' : 'active';
    }

    /**
     * Updates the UI based on the current status
     * @private
     */
    _updateUI() {
        if (!this.#button) return;

        // Remove existing classes
        this.#button.classList.remove('active', 'inactive', 'offline');

        // Add new class based on status
        this.#button.classList.add(this.status);

        // Update text label
        if (this.status === 'offline') {
            this.#textLabel.textContent = this.offlineText;
        }

        // Update accessibility
        this._updateAccessibility();
        
        // Update form value if in a form
        if (this.#internals) {
            this.#internals.setFormValue(this.status);
        }
        
        // Reflect the state to the attribute for light DOM styling and SEO
        this._reflectToLightDOM();
    }

    /**
     * Updates accessibility attributes
     * @private
     */
    _updateAccessibility() {
        if (!this.#button) return;

        if (this.status === 'offline') {
            // For offline status, we use button role instead of switch
            this.#button.setAttribute('role', 'button');
            this.#button.removeAttribute('aria-checked');
            this.#button.setAttribute('aria-label', `State is offline: ${this.offlineText}`);
        } else {
            // For active/inactive we use the switch role
            this.#button.setAttribute('role', 'switch');
            this.#button.setAttribute('aria-checked', this.status === 'active' ? 'true' : 'false');
            this.#button.setAttribute('aria-label', `State is ${this.status}`);
        }
    }
    
    /**
     * Reflects important state to light DOM for accessibility and SEO
     * @private
     */
    _reflectToLightDOM() {
        // Provide accessibility info in light DOM as well
        if (this.status === 'active') {
            this.setAttribute('aria-label', 'Status: active');
        } else if (this.status === 'inactive') {
            this.setAttribute('aria-label', 'Status: inactive');
        } else {
            this.setAttribute('aria-label', `Status: offline (${this.offlineText})`);
        }
    }

    /**
     * Gets the current status of the toggle button
     * @return {string} The current status: 'active', 'inactive', or 'offline'
     */
    get status() {
        return this.#status;
    }

    /**
     * Sets the status of the toggle button and updates the UI
     * @param {string} value - The new status: 'active', 'inactive', or 'offline'
     */
    set status(value) {
        if (ToggleButton.VALID_STATUSES.includes(value)) {
            const oldValue = this.#status;
            this.#status = value;
            
            // Update attribute if it differs
            if (this.getAttribute('status') !== value) {
                this.setAttribute('status', value);
            }
            
            // UI updates only when connected
            if (this.isConnected) {
                this._updateUI();
                
                // Only dispatch toggle event when changing between active/inactive
                if (oldValue !== value) {
                    // Only trigger for active/inactive transitions
                    if ((oldValue === 'active' || oldValue === 'inactive') && 
                        (value === 'active' || value === 'inactive')) {
                        this.dispatchEvent(new CustomEvent('toggle', {
                            bubbles: true,
                            composed: true,
                            detail: {
                                status: value,
                                previousStatus: oldValue
                            }
                        }));
                    }
                }
            }
        } else {
            console.warn(`Invalid status value: ${value}. Using default: ${ToggleButton.DEFAULT_STATUS}`);
            this.#status = ToggleButton.DEFAULT_STATUS;
            this.setAttribute('status', ToggleButton.DEFAULT_STATUS);
        }
    }

    /**
     * Gets the text displayed in the offline state
     * @return {string} The text displayed in the offline state
     */
    get offlineText() {
        return this.getAttribute('offline-text') || ToggleButton.DEFAULT_OFFLINE_TEXT;
    }

    /**
     * Sets the text displayed in the offline state
     * @param {string} value - The new text to display in the offline state
     */
    set offlineText(value) {
        this.setAttribute('offline-text', value || ToggleButton.DEFAULT_OFFLINE_TEXT);
    }
    
    /**
     * Checks if the toggle button is disabled
     * @return {boolean} Whether the toggle button is disabled
     */
    get disabled() {
        return this.hasAttribute('disabled');
    }
    
    /**
     * Sets the disabled state of the toggle button
     * @param {boolean} value - Whether the button should be disabled
     */
    set disabled(value) {
        const isDisabled = Boolean(value);
        if (isDisabled) {
            this.setAttribute('disabled', '');
            this.#button?.setAttribute('disabled', '');
            this.#button?.setAttribute('aria-disabled', 'true');
        } else {
            this.removeAttribute('disabled');
            this.#button?.removeAttribute('disabled');
            this.#button?.setAttribute('aria-disabled', 'false');
        }
        
        // Update form control if relevant
        if (this.#internals) {
            if (isDisabled) {
                this.#internals.ariaDisabled = 'true';
            } else {
                this.#internals.ariaDisabled = 'false';
            }
        }
    }
    
    /**
     * Form-associated custom element APIs
     */
    get form() { 
        return this.#internals ? this.#internals.form : null; 
    }
    
    get name() { 
        return this.getAttribute('name'); 
    }
    
    set name(value) { 
        this.setAttribute('name', value); 
    }
    
    get validity() {
        return this.#internals ? this.#internals.validity : null;
    }
    
    get validationMessage() {
        return this.#internals ? this.#internals.validationMessage : '';
    }
    
    get willValidate() {
        return this.#internals ? this.#internals.willValidate : false;
    }
    
    checkValidity() {
        return this.#internals ? this.#internals.checkValidity() : true;
    }
    
    reportValidity() {
        return this.#internals ? this.#internals.reportValidity() : true;
    }
}

// Register component
customElements.define('toggle-button', ToggleButton);