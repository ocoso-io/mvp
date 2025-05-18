// app/page.tsx
import Link from 'next/link';

export default function HomePage(): React.ReactElement {
    return (
        <div className="home-page">
            <section className="hero card">
                <h2>Willkommen bei OCOSO Staking</h2>
                <p className="lead">
                    Verdienen Sie Rewards, indem Sie Ihre NFTs staken und am OCOSO-Ökosystem teilnehmen.
                </p>
                <div className="cta-buttons">
                    <Link href="/wallet" className="button">
                        Wallet verbinden
                    </Link>
                    <Link href="/staking" className="button secondary">
                        Zum Staking
                    </Link>
                </div>
            </section>

            <section className="features">
                <h3>Unsere Features</h3>
                <div className="feature-grid">
                    <div className="feature-card card">
                        <h4>NFT Staking</h4>
                        <p>
                            Staken Sie Ihre OCOSO NFTs und verdienen Sie tägliche Rewards in OCOSO-Tokens.
                        </p>
                    </div>
                    <div className="feature-card card">
                        <h4>Token Rewards</h4>
                        <p>
                            Sammeln Sie OCOSO-Tokens und nutzen Sie diese für exklusive Vorteile im Ökosystem.
                        </p>
                    </div>
                    <div className="feature-card card">
                        <h4>Community Governance</h4>
                        <p>
                            Nehmen Sie an Entscheidungen teil und stimmen Sie über die Zukunft des Projekts ab.
                        </p>
                    </div>
                </div>
            </section>

            <section className="stats card">
                <h3>Aktuelle Statistiken</h3>
                <div className="stats-grid">
                    <div className="stat-item">
                        <span className="stat-value">1,234</span>
                        <span className="stat-label">Gestakte NFTs</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">5.3M</span>
                        <span className="stat-label">OCOSO Token im Umlauf</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">427</span>
                        <span className="stat-label">Aktive Staker</span>
                    </div>
                </div>
            </section>
        </div>
    );
}