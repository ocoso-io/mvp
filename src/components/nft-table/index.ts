// Dieser Einstiegspunkt exportiert die NFTTable-Komponente
// und stellt sicher, dass sie als Web-Komponente registriert ist

import { NFTTable } from './nft-table';

// Nur einmal registrieren, falls die Datei mehrfach importiert wird
if (!customElements.get('nft-table')) {
  customElements.define('nft-table', NFTTable);
}

export { NFTTable };