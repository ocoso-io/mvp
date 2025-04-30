/**
 * ShowButton Web Component
 * 
 * Eine wiederverwendbare Button-Komponente mit Ikonunterstützung, die verschiedene Aktionen auslösen kann.
 */
class ShowButton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Standard-Icon und -Aktion festlegen
        this._icon = 'icon-eye.png';
        this._action = 'show';
        this._label = 'Show Details';
        this._itemId = '';
        
        // Event-Handler binden
        this._handleClickBound = this._handleClick.bind(this);
        
        // Statische Styles einmal beim Instanziieren hinzufügen (Performance-Optimierung)
        this._createStyles();
        
        // Button-Element erstellen (vermeidet wiederholtes DOM-Rendering)
        this._createButton();
    }

    static get observedAttributes() {
        return ['icon', 'action', 'label', 'item-id', 'disabled'];
    }

    connectedCallback() {
        // Nur Button-Attribute aktualisieren, anstatt neu zu rendern
        this._updateButtonAttributes();
        this.shadowRoot.addEventListener('click', this._handleClickBound);
    }

    disconnectedCallback() {
        this.shadowRoot.removeEventListener('click', this._handleClickBound);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        switch (name) {
            case 'icon':
                this._icon = newValue;
                if (this._imgElement) {
                    this._imgElement.src = `/img/${newValue}`;
                    this._imgElement.alt = this._label;
                }
                break;
            case 'action':
                this._action = newValue;
                if (this._button) {
                    this._button.dataset.action = newValue;
                    this._button.classList.toggle('tooltip', newValue === 'show');
                }
                break;
            case 'label':
                this._label = newValue;
                if (this._button) {
                    this._button.setAttribute('aria-label', newValue);
                    this._button.dataset.tooltip = newValue;
                }
                if (this._imgElement) {
                    this._imgElement.alt = newValue;
                }
                break;
            case 'item-id':
                this._itemId = newValue;
                if (this._button) {
                    this._button.dataset.itemId = newValue;
                }
                break;
            case 'disabled':
                if (this._button) {
                    this._button.disabled = this.hasAttribute('disabled');
                }
                break;
        }
    }
    
    // Getter und Setter für Eigenschaften
    get icon() {
        return this._icon;
    }
    
    set icon(value) {
        this.setAttribute('icon', value);
    }
    
    get action() {
        return this._action;
    }
    
    set action(value) {
        this.setAttribute('action', value);
    }
    
    get label() {
        return this._label;
    }
    
    set label(value) {
        this.setAttribute('label', value);
    }
    
    get itemId() {
        return this._itemId;
    }
    
    set itemId(value) {
        this.setAttribute('item-id', value);
    }
    
    get disabled() {
        return this.hasAttribute('disabled');
    }
    
    set disabled(value) {
        if (value) {
            this.setAttribute('disabled', '');
        } else {
            this.removeAttribute('disabled');
        }
    }

    _createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: inline-block;
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
            }
            
            button:hover {
                transform: scale(1.1);
            }
            
            button:active {
                transform: scale(0.95);
            }
            
            img {
                width: 20px;
                height: 20px;
                display: block;
            }
            
            /* Optional: Aktiviere diese Stile, wenn du einen Tooltip haben möchtest */
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
            
            /* Styling für verschiedene Aktionen */
            :host([action="show"]) button { color: var(--show-color, #4a90e2); }
            :host([action="edit"]) button { color: var(--edit-color, #f5a623); }
            :host([action="delete"]) button { color: var(--delete-color, #e74c3c); }
            :host([action="download"]) button { color: var(--download-color, #2ecc71); }
            
            /* Zustände des Buttons */
            :host([disabled]) button {
                cursor: not-allowed;
                opacity: 0.5;
            }
            
            :host([disabled]) button:hover {
                transform: none;
            }
        `;
        this.shadowRoot.appendChild(style);
    }
    
    _createButton() {
        // Button erstellen
        const button = document.createElement('button');
        button.part = 'button';
        button.className = this._action === 'show' ? 'tooltip' : '';
        
        // Img erstellen
        const img = document.createElement('img');
        img.part = 'icon';
        img.alt = this._label;
        img.src = `/img/${this._icon}`;
        
        // DOM zusammensetzen
        button.appendChild(img);
        this.shadowRoot.appendChild(button);
        
        // Referenzen für spätere Updates speichern
        this._button = button;
        this._imgElement = img;
    }
    
    _updateButtonAttributes() {
        if (!this._button) return;
        
        this._button.setAttribute('aria-label', this._label);
        this._button.dataset.tooltip = this._label;
        this._button.dataset.action = this._action;
        this._button.dataset.itemId = this._itemId;
        this._button.disabled = this.hasAttribute('disabled');
        this._button.className = this._action === 'show' ? 'tooltip' : '';
    }

    _handleClick(event) {
        if (this.hasAttribute('disabled')) return;
        
        // Erstelle ein benutzerdefiniertes Event mit den relevanten Daten
        const actionEvent = new CustomEvent(`${this._action}-action`, {
            bubbles: true,
            composed: true,
            detail: {
                action: this._action,
                itemId: this._itemId,
                source: this
            }
        });
        
        // Event auslösen
        this.dispatchEvent(actionEvent);
    }
}

// Exportieren der Klasse für Verwendung mit ES Modules
export default ShowButton;

// Component registrieren
customElements.define('show-button', ShowButton);