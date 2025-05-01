export const tableStyles = `
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
`;