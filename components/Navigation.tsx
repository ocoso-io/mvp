// components/Navigation.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation(): React.ReactElement {
    const pathname = usePathname();

    return (
        <nav className="main-nav">
            <ul>
                <li className={pathname === '/' ? 'active' : ''}>
                    <Link href="/">Home</Link>
                </li>
                <li className={pathname === '/wallet' ? 'active' : ''}>
                    <Link href="/wallet">Wallet</Link>
                </li>
                <li className={pathname === '/staking' ? 'active' : ''}>
                    <Link href="/staking">Staking</Link>
                </li>
            </ul>
        </nav>
    );
}