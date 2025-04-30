/**
 * Represents a customizable toggle button element that extends the base `HTMLElement`.
 * This component provides three states: active, inactive, and offline, with respective
 * visual feedback and accessibility attributes. It emits custom events when toggled
 * or clicked while in the offline state.
 *
 * Attributes:
 * - `status`: Represents the current state of the toggle button. Valid values are:
 *   - `active`: Indicates the toggle is in the active state.
 *   - `inactive`: Indicates the toggle is in the inactive state.
 *   - `offline`: Indicates the toggle is in the offline state.
 * - `offline-text`: Optional text displayed when the button is in the offline state.
 *
 * Observed Attributes:
 * - `status`: Watches for changes to the button's state and updates the UI accordingly.
 * - `offline-text`: Updates the displayed text when in the offline state.
 *
 * Properties:
 * - `status`: Getter and setter for the toggle's current state. Automatically syncs with the `status` attribute.
 * - `offlineText`: Getter and setter for the text content displayed in the offline state. Syncs with the `offline-text` attribute.
 *
 * Methods:
 * - `connectedCallback`: Lifecycle method invoked when the element is added to the DOM. Initializes status and event listeners.
 * - `disconnectedCallback`: Lifecycle method invoked when the element is removed from the DOM. Cleans up event listeners.
 * - `adoptedCallback`: Lifecycle method invoked when the element is moved to a new document. Ensures UI is updated.
 * - `attributeChangedCallback`: Handles changes to observed attributes and updates the component's UI or state as needed.
 *
 * Internal Methods:
 * - `_createInitialDOM()`: Constructs and appends the initial DOM structure of the toggle button.
 * - `_updateUI()`: Updates the visual state and accessibility attributes of the toggle button based on its current status.
 * - `_updateAccessibility()`: Ensures accessibility attributes (`aria-` and `role`) are correctly set based on the current state.
 * - `_handleClick(event)`: Handles click events on the toggle button. Updates the state and dispatches custom events.
 *
 * Events:
 * - `toggle`: Fired when the button's state changes between `active` and `inactive`. The event includes a `detail` object with the new `status`.
 * - `offline-click`: Fired when the button is clicked while in the `offline` state. The event includes a `detail` object with the current `status`.
 *
 * CSS Custom Properties:
 * - The toggle button supports various CSS custom properties for styling, including:
 *   - `--toggle-active-color`: Background color when the toggle is active.
 *   - `--toggle-inactive-color`: Background color when the toggle is inactive.
 *   - `--toggle-offline-color`: Background color when the toggle is offline.
 *   - `--toggle-indicator-color`: Color of the indicator within the toggle button.
 *   - `--toggle-indicator-size`: Size of the toggle's circular indicator.
 * - Additional custom properties are available for consistent control over padding, size, typography, and transitions.
 */
export class ToggleButton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this._button = null;
        this._status = 'inactive';
        this._handleClick = this._handleClick.bind(this);

        // Create initial DOM structure
        this._createInitialDOM();
    }

    _createInitialDOM() {
        // Create static part of the DOM
        const style = document.createElement('style');
        style.textContent = ToggleButton.styles;
        this.shadowRoot.appendChild(style);

        // Create button
        const button = document.createElement('button');
        button.setAttribute('role', 'switch');

        // Container for indicator or text
        const contentContainer = document.createElement('div');
        contentContainer.className = 'content-container';

        // Create indicator
        const indicator = document.createElement('span');
        indicator.className = 'indicator';
        contentContainer.appendChild(indicator);

        // Create text label (for offline status)
        const textLabel = document.createElement('span');
        textLabel.className = 'text-label';
        contentContainer.appendChild(textLabel);

        button.appendChild(contentContainer);
        this.shadowRoot.appendChild(button);

        // Store references
        this._button = button;
        this._textLabel = textLabel;
    }

    connectedCallback() {
        // Initial status check and application
        if (!this.hasAttribute('status')) {
            this.setAttribute('status', 'inactive');
        } else {
            this._updateUI();
        }

        this._button.addEventListener('click', this._handleClick);
    }

    disconnectedCallback() {
        if (this._button) {
            this._button.removeEventListener('click', this._handleClick);
        }
    }

    adoptedCallback() {
        this._updateUI();
    }

    static get styles() {
        return `
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
            }
            
            .content-container {
                display: flex;
                width: 100%;
                height: 100%;
                align-items: center;
                justify-content: center;
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
        `;
    }

    static get observedAttributes() {
        return ['status', 'offline-text'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'status' && oldValue !== newValue) {
            // Validate the new value
            const validStatuses = ['active', 'inactive', 'offline'];
            if (validStatuses.includes(newValue)) {
                this._status = newValue;
            } else {
                this._status = 'inactive';
                this.setAttribute('status', 'inactive');
                return;
            }

            this._updateUI();
        } else if (name === 'offline-text' && this._textLabel) {
            this._textLabel.textContent = newValue || 'OFF';
        }
    }

    get status() {
        return this._status;
    }

    set status(value) {
        const validValues = ['active', 'inactive', 'offline'];
        if (validValues.includes(value)) {
            this._status = value;
            this.setAttribute('status', value);
        } else {
            this._status = 'inactive';
            this.setAttribute('status', 'inactive');
        }
    }

    get offlineText() {
        return this.getAttribute('offline-text') || 'OFF';
    }

    set offlineText(value) {
        this.setAttribute('offline-text', value);
    }

    _handleClick(event) {
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
        if (this.status === 'active') {
            this.status = 'inactive';
        } else if (this.status === 'inactive') {
            this.status = 'active';
        }

        // Trigger standard toggle event
        this.dispatchEvent(new CustomEvent('toggle', {
            bubbles: true,
            composed: true,
            detail: {status: this.status}
        }));
    }

    _updateUI() {
        if (!this._button) return;

        // Remove existing classes
        this._button.classList.remove('active', 'inactive', 'offline');

        // Add new class based on status
        this._button.classList.add(this.status);

        // Update text label
        if (this.status === 'offline') {
            this._textLabel.textContent = this.offlineText;
        }

        // Update accessibility
        this._updateAccessibility();
    }

    _updateAccessibility() {
        if (!this._button) return;

        if (this.status === 'offline') {
            // For offline status, we use button role instead of switch
            this._button.setAttribute('role', 'button');
            this._button.removeAttribute('aria-checked');
            this._button.setAttribute('aria-label', `State is offline: ${this.offlineText}`);
        } else {
            // For active/inactive we use the switch role
            this._button.setAttribute('role', 'switch');
            this._button.setAttribute('aria-checked', this.status === 'active' ? 'true' : 'false');
            this._button.setAttribute('aria-label', `State is ${this.status}`);
        }
    }
}

// Register component
customElements.define('toggle-button', ToggleButton);
