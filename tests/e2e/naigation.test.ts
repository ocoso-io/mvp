// tests/e2e/navigation.test.ts
import { test, expect } from '@playwright/test';

test('navigation works correctly', async ({ page }) => {
  await page.goto('/');
  
  // Prüfen, ob der Titel korrekt ist
  await expect(page).toHaveTitle(/OCOSO Staking/);
  
  // Überprüfen der Hauptelemente auf der Startseite
  await expect(page.locator('h2:has-text("Willkommen bei OCOSO Staking")')).toBeVisible();
  
  // Auf einen Link klicken und Navigation testen
  await page.click('text=Wallet verbinden');
  
  // Prüfen, ob wir zur Wallet-Seite navigiert sind
  await expect(page).toHaveURL(/.*wallet/);
  
  // Zurück zur Startseite
  await page.click('text=Home');
  await expect(page).toHaveURL(/\/$/);
  
  // Zum Staking navigieren
  await page.click('text=Zum Staking');
  await expect(page).toHaveURL(/.*staking/);
});