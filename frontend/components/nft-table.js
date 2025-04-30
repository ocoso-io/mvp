class NFTTable extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.nfts = [];
    }

    connectedCallback() {
        this.render();
        this.loadNFTData();
    }

    static get styles() {
        return `
            @import "components/nft-table.css"
        `;
    }

    async loadNFTData() {
        try {
            // Placeholder for NFT data loading
            // This should be replaced with actual API call
            this.nfts = [];
            this.render();
        } catch (error) {
            console.error('Error loading NFT data:', error);
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>${NFTTable.styles}</style>
            <table class="data-table">
                <thead class="table-header">
                    <tr class="header-row">
                        <th class="header-cell">IP-NFT</th>
                        <th class="header-cell">Type</th>
                        <th class="header-cell">TOPICS</th>
                        <th class="header-cell">Actions</th>
                        <th class="header-cell">Active</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.nfts.map(nft => `
                        <tr>
                            <td>${nft.id}</td>
                            <td>${nft.title}</td>
                            <td>${nft.description}</td>
                            <td>${nft.ipfsHash}</td>
                            <td>${nft.owner}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

customElements.define('nft-table', NFTTable);