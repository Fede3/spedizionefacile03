import { test, expect } from '@playwright/test';
import { resolveE2EStorageState } from './utils/authState';

const adminStorageState = resolveE2EStorageState('admin');
const hasAuthStorage = Boolean(adminStorageState);

test.describe('Admin - Protezione Route', () => {
	test('T7.0.1 - admin dashboard richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});

	test('T7.0.2 - admin ordini richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione/ordini');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});

	test('T7.0.3 - admin utenti richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione/utenti');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});

	test('T7.0.4 - admin prezzi richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione/prezzi');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});

	test('T7.0.5 - admin coupon richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione/coupon');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});

	test('T7.0.6 - admin blog richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione/blog');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});

	test('T7.0.7 - admin guide richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione/guide');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});

	test('T7.0.8 - admin impostazioni richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione/impostazioni');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});

	test('T7.0.9 - admin spedizioni richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione/spedizioni');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});

	test('T7.0.10 - admin portafogli richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione/portafogli');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});

	test('T7.0.11 - admin prelievi richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione/prelievi');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});

	test('T7.0.12 - admin referral richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione/referral');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});

	test('T7.0.13 - admin messaggi richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione/messaggi');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});

	test('T7.0.14 - admin servizi richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione/servizi');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});

	test('T7.0.16 - admin immagine homepage richiede autenticazione', async ({ page }) => {
		await page.goto('/account/amministrazione/immagine-homepage');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 });
	});
});

test.describe('Admin - Pagine (richiede admin auth)', () => {
	if (adminStorageState) {
		test.use({ storageState: adminStorageState });
	}

	// Questi test richiedono un utente con ruolo Admin.
	// Per bootstrap rapido: eseguire tests/e2e/auth.setup.spec.ts
	// oppure valorizzare PLAYWRIGHT_STORAGE_STATE / TEST_STORAGE_STATE.
	test.skip(!hasAuthStorage, 'Richiede utente Admin autenticato - attivare con auth setup');

	test('T7.1.1 - dashboard admin mostra statistiche', async ({ page }) => {
		await page.goto('/account/amministrazione');
		await expect(page.getByText(/ordini|ricavi|utenti/i).first()).toBeVisible();
	});

	test('T7.2.1 - lista ordini admin paginata', async ({ page }) => {
		await page.goto('/account/amministrazione/ordini');
		await page.waitForLoadState('networkidle');
		const content = await page.locator('main').textContent();
		expect(content?.length).toBeGreaterThan(0);
	});

	test('T7.3.1 - lista utenti admin', async ({ page }) => {
		await page.goto('/account/amministrazione/utenti');
		await page.waitForLoadState('networkidle');
		const content = await page.locator('main').textContent();
		expect(content?.length).toBeGreaterThan(0);
	});

	test('T7.4.1 - fasce prezzo visibili', async ({ page }) => {
		await page.goto('/account/amministrazione/prezzi');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: 'Prezzi e fasce' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Nazionale' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Fasce peso' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Fasce volume' })).toBeVisible();
	});

	test('T7.5.1 - lista coupon visibile', async ({ page }) => {
		await page.goto('/account/amministrazione/coupon');
		await page.waitForLoadState('networkidle');
		const content = await page.locator('main').textContent();
		expect(content?.length).toBeGreaterThan(0);
	});

	test('T7.6.1 - lista blog visibile', async ({ page }) => {
		await page.goto('/account/amministrazione/blog');
		await page.waitForLoadState('networkidle');
		const content = await page.locator('main').textContent();
		expect(content?.length).toBeGreaterThan(0);
	});

	test('T7.6.2 - crea nuovo articolo', async ({ page }) => {
		await page.goto('/account/amministrazione/blog/nuovo');
		await expect(page.locator('input, textarea, [contenteditable]').first()).toBeVisible();
	});

	test('T7.7.1 - impostazioni admin visibili', async ({ page }) => {
		await page.goto('/account/amministrazione/impostazioni');
		await page.waitForLoadState('networkidle');
		const content = await page.locator('main').textContent();
		expect(content?.length).toBeGreaterThan(0);
	});
});
