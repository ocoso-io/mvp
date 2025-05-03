// Basis-Interfaces für unser System

export interface NFTData {
  id: string;
  type: string;
  categories?: string[];
  status?: string;
  [key: string]: any;
}

export interface DataProviderEventDetail {
  action?: string;
  id?: string;
  item?: NFTData;
}

export interface DataProviderEvent extends CustomEvent {
  detail: DataProviderEventDetail;
}

export interface DataProvider {
  getData(): NFTData[];
  getItem(id: string): NFTData | null;
  addItem(item: NFTData): void;
  updateItem(item: Partial<NFTData> & { id: string }): void;
  removeItem(id: string): void;
  addEventListener(event: string, callback: (event: DataProviderEvent) => void): void;
  removeEventListener(event: string, callback: (event: DataProviderEvent) => void): void;
  onSpecificChange?(event: string, callback: (event: DataProviderEvent) => void): void;
}

export interface StatusMapper {
  getStatusClass(nft: NFTData): string;
}