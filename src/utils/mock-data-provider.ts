// src/utils/mock-data-provider.ts
import { DataProvider, NFTData, DataProviderEventDetail } from '../types';

export class MockDataProvider implements DataProvider {
  private data: NFTData[];
  private eventTarget: EventTarget;

  constructor(initialData: NFTData[] = []) {
    this.data = [...initialData];
    this.eventTarget = new EventTarget();
  }

  getData(): NFTData[] {
    return [...this.data];
  }

  getItem(id: string): NFTData | null {
    return this.data.find(item => item.id === id) || null;
  }

  addItem(item: NFTData): void {
    this.data.push(item);
    this.notifyDataChanged({ action: 'add', id: item.id, item });
  }

  updateItem(item: Partial<NFTData> & { id: string }): void {
    const index = this.data.findIndex(existingItem => existingItem.id === item.id);
    if (index !== -1) {
      this.data[index] = { ...this.data[index], ...item };
      this.notifyDataChanged({
        action: 'update',
        id: item.id,
        item: this.data[index]
      });
    }
  }

  removeItem(id: string): void {
    const index = this.data.findIndex(item => item.id === id);
    if (index !== -1) {
      const item = this.data[index];
      this.data.splice(index, 1);
      this.notifyDataChanged({ action: 'remove', id, item });
    }
  }

  private notifyDataChanged(detail: DataProviderEventDetail): void {
    const event = new CustomEvent('data-changed', { detail });
    this.eventTarget.dispatchEvent(event);
  }

  addEventListener(event: string, callback: (event: CustomEvent) => void): void {
    this.eventTarget.addEventListener(event, callback as EventListener);
  }

  removeEventListener(event: string, callback: (event: CustomEvent) => void): void {
    this.eventTarget.removeEventListener(event, callback as EventListener);
  }
}