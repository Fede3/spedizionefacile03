import { test, expect } from '@playwright/test';

test.describe('Referral & Wallet', () => {
	test('Wallet richiede autenticazione', async ({ page }) => {
		await page.goto('/account/portafoglio');
		await expect(page).toHaveURL(/autenticazione/);
	});

	test('Bonus/referral richiede autenticazione', async ({ page }) => {
		await page.goto('/account/bonus');
		await expect(page).toHaveURL(/autenticazione/);
	});

	test('Prelievi richiede autenticazione', async ({ page }) => {
		await page.goto('/account/prelievi');
		await expect(page).toHaveURL(/autenticazione/);
	});

	test('Registrazione con parametro ref preserva codice', async ({ page }) => {
		await page.goto('/autenticazione?ref=TESTCODE123');
		await page.waitForLoadState('networkidle');
		const registerTab = page.getByRole('tab', { name: /registrati/i });
		await expect(registerTab).toBeVisible();
		await registerTab.click();
		await page.waitForTimeout(500);

		await expect(page.getByText(/codice referral applicato/i)).toBeVisible();
		await expect(page.getByText('TESTCODE123')).toBeVisible();
	});
});
