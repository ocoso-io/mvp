// src/components/nft-table/nft-table.ts
import { DataProvider, NFTData } from '../../types';

export interface StatusMapper {
  mapStatus(status: string): string;
  getStatusClass(status: string): string;
}

export class NFTTable extends HTMLElement {
  private dataProvider: DataProvider | null = null;
  private statusMapper: StatusMapper | null = null;
  private gridBodyElement: HTMLElement | null = null;

  // Basis-Styling
  private baseStyles = `
    .nft-table-container {
      font-family: var(--nft-font-family, Arial, sans-serif);
      color: var(--nft-text-color, #333);
      width: 100%;
      position: relative;
    }
    
    .nft-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 2fr 2fr 1fr;
      width: 100%;
      border: 1px solid var(--nft-border-color, #ddd);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .nft-grid-header {
      font-weight: bold;
      background-color: var(--nft-header-bg, #f5f5f5);
      border-bottom: 2px solid var(--nft-border-color, #ddd);
    }
    
    .nft-grid-header-cell {
      padding: 12px 16px;
      text-align: left;
    }
    
    .nft-grid-body-row {
      border-bottom: 1px solid var(--nft-border-color, #eee);
    }
    
    .nft-grid-body-row:last-child {
      border-bottom: none;
    }
    
    .nft-grid-body-cell {
      padding: 10px 16px;
    }
    
    .nft-action-button {
      background-color: var(--nft-button-bg, #4285f4);
      color: var(--nft-button-text, white);
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      font-size: 14px;
    }
    
    .nft-action-button:hover {
      background-color: var(--nft-button-hover-bg, #3367d6);
    }
    
    .nft-status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      text-align: center;
    }
    
    .nft-status-online {
      background-color: var(--nft-status-online-bg, #e6f4ea);
      color: var(--nft-status-online-color, #137333);
    }
    
    .nft-status-offline {
      background-color: var(--nft-status-offline-bg, #fce8e6);
      color: var(--nft-status-offline-color, #c5221f);
    }
    
    .nft-empty-message {
      grid-column: 1 / -1;
      padding: 20px;
      text-align: center;
      color: var(--nft-empty-color, #757575);
    }
  `;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  // Getter/Setter für dataProvider
  get provider(): DataProvider | null {
    return this.dataProvider;
  }

  set provider(provider: DataProvider | null) {
    this.dataProvider = provider;
    this.fetchAndRenderData();
  }

  // Getter/Setter für statusMapper
  get mapper(): StatusMapper | null {
    return this.statusMapper;
  }

  set mapper(mapper: StatusMapper | null) {
    this.statusMapper = mapper;
    this.renderData();
  }

  connectedCallback() {
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.removeEventListeners();
  }

  private setupEventListeners() {
    if (this.dataProvider) {
      this.dataProvider.addEventListener('data-changed', this.handleDataChanged);
    }
  }

  private removeEventListeners() {
    if (this.dataProvider) {
      this.dataProvider.removeEventListener('data-changed', this.handleDataChanged);
    }
  }

  private handleDataChanged = () => {
    this.fetchAndRenderData();
  }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>${this.baseStyles}</style>
      <div class="nft-table-container">
        <div class="nft-grid">
          <div class="nft-grid-header">
            <div class="nft-grid-header-cell">IP-NFT</div>
            <div class="nft-grid-header-cell">Type</div>
            <div class="nft-grid-header-cell">TOPICS</div>
            <div class="nft-grid-header-cell">Actions</div>
            <div class="nft-grid-header-cell">Active</div>
          </div>
          <div class="nft-grid-body">
            <div class="nft-empty-message">No data available</div>
          </div>
        </div>
      </div>
    `;

    this.gridBodyElement = this.shadowRoot.querySelector('.nft-grid-body');

    this.fetchAndRenderData();
  }

  private fetchAndRenderData() {
    if (!this.dataProvider || !this.gridBodyElement) return;

    try {
      const data = this.dataProvider.getData();
      this.renderData(data);
    } catch (error) {
      console.error('Error fetching NFT data:', error);
      this.renderError('Failed to load NFT data');
    }
  }

  private renderData(data: NFTData[] = []) {
    if (!this.gridBodyElement) return;

    if (data.length === 0) {
      this.gridBodyElement.innerHTML = `<div class="nft-empty-message">No NFT data available</div>`;
      return;
    }

    const rowsHtml = data.map(nft => this.renderRow(nft)).join('');
    this.gridBodyElement.innerHTML = rowsHtml;

    // Event-Listener für Action-Buttons hinzufügen
    const actionButtons = this.gridBodyElement.querySelectorAll('.nft-action-button');
    actionButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLElement;
        const nftId = target.dataset.nftId;

        if (nftId) {
          const nft = data.find(item => item.id === nftId);
          if (nft) {
            this.dispatchEvent(new CustomEvent('nft-select', {
              detail: { nft },
              bubbles: true,
              composed: true
            }));
          }
        }
      });
    });
  }

  private renderRow(nft: NFTData): string {
    const status = nft.status || 'unknown';
    const statusClass = this.statusMapper
        ? this.statusMapper.getStatusClass(status)
        : `nft-status-${status.toLowerCase()}`;

    const statusText = this.statusMapper
        ? this.statusMapper.mapStatus(status)
        : status;

    const categoriesText = nft.categories ? nft.categories.join(', ') : '';

    return `
      <div class="nft-grid-body-row" data-nft-id="${nft.id}">
        <div class="nft-grid-body-cell">${nft.id}</div>
        <div class="nft-grid-body-cell">${nft.type}</div>
        <div class="nft-grid-body-cell">${categoriesText}</div>
        <div class="nft-grid-body-cell">
          <button class="nft-action-button" data-nft-id="${nft.id}">Details</button>
        </div>
        <div class="nft-grid-body-cell">
          <span class="nft-status ${statusClass}">${statusText}</span>
        </div>
      </div>
    `;
  }

  private renderError(message: string) {
    if (!this.gridBodyElement) return;

    this.gridBodyElement.innerHTML = `
      <div class="nft-empty-message">${message}</div>
    `;
  }
}

// Registriere die Komponente
customElements.define('nft-table', NFTTable);