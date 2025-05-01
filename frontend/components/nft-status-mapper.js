/**
 * NFT Status Mapper
 * Maps NFT status values to CSS classes and display text
 */
export class NFTStatusMapper {
    #statusMap = {
        active: {
            class: 'active',
            text: 'Active'
        },
        inactive: {
            class: 'inactive',
            text: 'Inactive'
        },
        offline: {
            class: 'offline',
            text: 'Offline'
        }
    };
    
    /**
     * @param {Object} customMap - Custom status mappings
     */
    constructor(customMap = {}) {
        this.#statusMap = { ...this.#statusMap, ...customMap };
    }
    
    /**
     * Get the CSS class for a status
     * @param {Object} nft - The NFT object
     * @returns {string} The CSS class
     */
    getStatusClass(nft) {
        const status = nft?.status || 'offline';
        return this.#statusMap[status]?.class || status;
    }
    
    /**
     * Get the display text for a status
     * @param {Object} nft - The NFT object
     * @returns {string} The display text
     */
    getStatusText(nft) {
        const status = nft?.status || 'offline';
        return this.#statusMap[status]?.text || status;
    }
    
    /**
     * Get all possible statuses
     * @returns {Array<string>} Array of status keys
     */
    getAllStatuses() {
        return Object.keys(this.#statusMap);
    }
    
    /**
     * Add or update a status mapping
     * @param {string} status - The status key
     * @param {Object} mapping - The status mapping ({ class, text })
     */
    setStatusMapping(status, mapping) {
        if (!status || typeof status !== 'string') return;
        
        this.#statusMap[status] = {
            class: mapping.class || status,
            text: mapping.text || status
        };
    }
}