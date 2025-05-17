import { NFTTable } from './NFTTable';

if (!customElements.get('nft-table')) {
  customElements.define('nft-table', NFTTable);
}

export { NFTTable };