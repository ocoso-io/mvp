/**
 * NFT Data Provider
 * Handles loading, filtering, and managing NFT data
 */
export class NFTDataProvider extends EventTarget {
    #nfts = [];
    #dataSource = null;
    #fetchOptions = {
        headers: {
            'Accept': 'application/json'
        }
    };
    #abortController = null;
    
    /**
     * @param {string} dataSource - URL or path to the NFT data
     * @param {Object} options - Additional options for data fetching
     */
    constructor(dataSource, options = {}) {
        super();
        this.#dataSource = dataSource;
        this.#fetchOptions = { ...this.#fetchOptions, ...options };
    }
    
    /**
     * Get all NFT data
     * @returns {Array} Array of NFT objects
     */
    getData() {
        return [...this.#nfts]; // Return a copy to prevent modification
    }
    
    /**
     * Get a specific NFT by ID
     * @param {string} id - The NFT ID
     * @returns {Object|null} The NFT object or null if not found
     */
    getItem(id) {
        const nft = this.#nfts.find(item => item.id === id);
        return nft ? { ...nft } : null;
    }
    
    /**
     * Add a new NFT
     * @param {Object} nft - The NFT object to add
     * @returns {boolean} Success indicator
     */
    addItem(nft) {
        if (!nft || !nft.id) return false;
        
        // Check if NFT already exists
        const existingIndex = this.#nfts.findIndex(item => item.id === nft.id);
        if (existingIndex >= 0) {
            // Update instead of add
            return this.updateItem(nft);
        }
        
        // Add to array
        this.#nfts.push({ ...nft });
        
        // Notify listeners with specific event and action
        this.dispatchEvent(new CustomEvent('item-added', {
            detail: { 
                item: { ...nft },
                index: this.#nfts.length - 1
            }
        }));
        
        // Also notify with general data-changed event for backward compatibility
        this.#notifyChanges('add', nft);
        return true;
    }

    /**
     * Update an existing NFT
     * @param {Object} nft - The NFT object with updated data
     * @returns {boolean} Success indicator
     */
    updateItem(nft) {
        if (!nft || !nft.id) return false;

        const index = this.#nfts.findIndex(item => item.id === nft.id);
        if (index === -1) return false;

        // Keep old item for diff calculation
        const oldItem = { ...this.#nfts[index] };

        // Update in array
        this.#nfts[index] = { ...this.#nfts[index], ...nft };

        // Create a diff object containing only changed fields
        const changes = {};
        for (const key in nft) {
            if (JSON.stringify(oldItem[key]) !== JSON.stringify(nft[key])) {
                changes[key] = nft[key];
            }
        }

        // Notify listeners with specific event and changes
        this.dispatchEvent(new CustomEvent('item-updated', {
            detail: {
                id: nft.id,
                item: { ...this.#nfts[index] },
                changes,
                index
            }
        }));

        // Also notify with general data-changed event for backward compatibility
        this.#notifyChanges('update', this.#nfts[index]);
        return true;
    }
    
    /**
     * Remove an NFT
     * @param {string} id - The ID of the NFT to remove
     * @returns {boolean} Success indicator
     */
    removeItem(id) {
        if (!id) return false;
        
        const index = this.#nfts.findIndex(nft => nft.id === id);
        if (index === -1) return false;
        
        // Store for event
        const removedNFT = { ...this.#nfts[index] };
        
        // Remove from array
        this.#nfts.splice(index, 1);
        
        // Notify listeners with specific event
        this.dispatchEvent(new CustomEvent('item-removed', {
            detail: { 
                id,
                item: removedNFT,
                index
            }
        }));
        
        // Also notify with general data-changed event for backward compatibility
        this.#notifyChanges('remove', removedNFT);
        return true;
    }

    /**
     * Listen for specific data changes
     * @param {string} eventType - The specific event type to listen for ('item-added', 'item-updated', 'item-removed')
     * @param {Function} callback - The callback function
     * @returns {Function} A function to remove the event listener
     */
    onSpecificChange(eventType, callback) {
        if (typeof callback !== 'function') return () => {};

        // Validate event type
        if (!['item-added', 'item-updated', 'item-removed'].includes(eventType)) {
            console.error(`Invalid event type: ${eventType}`);
            return () => {};
        }

        this.addEventListener(eventType, callback);

        // Return a function to remove the listener
        return () => {
            this.removeEventListener(eventType, callback);
        };
    }

    /**
     * Filter NFTs by search term
     * @param {string} searchTerm - The search term
     * @returns {Array} Filtered NFT array
     */
    filterByTerm(searchTerm) {
        if (!searchTerm || typeof searchTerm !== 'string') {
            return this.getData();
        }
        
        const term = searchTerm.toLowerCase().trim();
        
        return this.#nfts.filter(nft => {
            // Search in different fields
            return (
                (nft.id && nft.id.toLowerCase().includes(term)) ||
                (nft.type && nft.type.toLowerCase().includes(term)) ||
                (nft.categories && nft.categories.some(cat => 
                    cat.toLowerCase().includes(term)
                ))
            );
        });
    }
    
    /**
     * Load data from the data source
     * @returns {Promise<Array>} The loaded NFT data
     */
    async load() {
        // Abort any previous requests
        if (this.#abortController) {
            this.#abortController.abort();
        }
        
        // Create new abort controller
        this.#abortController = new AbortController();
        
        try {
            if (!this.#dataSource) {
                this.#nfts = [];
                this.#notifyChanges('load', []);
                return [];
            }
            
            const response = await fetch(this.#dataSource, {
                ...this.#fetchOptions,
                signal: this.#abortController.signal
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            this.#nfts = Array.isArray(data) ? [...data] : [];
            
            // Notify listeners with specific event
            this.dispatchEvent(new CustomEvent('data-loaded', {
                detail: { 
                    items: this.getData(),
                    count: this.#nfts.length
                }
            }));
            
            // Also notify with general data-changed event for backward compatibility
            this.#notifyChanges('load', this.#nfts);
            
            return this.getData();
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error loading NFT data:', error);
                this.dispatchEvent(new CustomEvent('load-error', {
                    detail: { error }
                }));
            }
            throw error;
        }
    }
    
    /**
     * Reload data from the data source
     * @returns {Promise<Array>} The reloaded NFT data
     */
    reload() {
        return this.load();
    }
    
    /**
     * Clear all NFT data
     */
    clear() {
        this.#nfts = [];
        
        // Notify listeners with specific event
        this.dispatchEvent(new CustomEvent('data-cleared', {
            detail: { count: 0 }
        }));
        
        // Also notify with general data-changed event for backward compatibility
        this.#notifyChanges('clear', []);
    }

    /**
     * Private method to notify listeners of data changes
     * @param {string} action - The action that occurred ('add', 'update', 'remove')
     * @param {Object} item - The affected item
     * @private
     */
    #notifyChanges(action, item) {
        this.dispatchEvent(new CustomEvent('data-changed', {
            detail: {
                action,
                data: { ...item }
            }
        }));
    }
}