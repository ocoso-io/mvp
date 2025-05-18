// tests/components/Navigation.test.tsx
import { render, screen } from '@testing-library/react';

import Navigation from '@components/Navigation';

// Mock für next/navigation
jest.mock('next/navigation', () => ({
    usePathname: () => '/',
}));

describe('Navigation', () => {
    it('renders navigation links', () => {
        render(<Navigation />);

        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Wallet')).toBeInTheDocument();
        expect(screen.getByText('Staking')).toBeInTheDocument();
    });

    it('highlights active link', () => {
        render(<Navigation />);

        const homeLink = screen.getByText('Home').closest('li');
        expect(homeLink).toHaveClass('active');
    });
});