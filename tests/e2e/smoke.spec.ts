import { test, expect } from '@playwright/test';

/**
 * Smoke test E2E post-rewrite v2 (Inertia monolite).
 * Verifica che le 12 pagine pubbliche principali rendano in browser.
 */
test.describe('Smoke pages pubbliche Inertia', () => {
	const pages = [
		{ path: '/', heading: 'Spedisci in' },
		{ path: '/preventivo', heading: 'Calcola il tuo preventivo' },
		{ path: '/servizi', heading: 'I nostri servizi' },
		{ path: '/chi-siamo', heading: 'Intermediari BRT autorizzati' },
		{ path: '/contatti', heading: 'Parla con noi' },
		{ path: '/faq', heading: 'Domande frequenti' },
		{ path: '/traccia', heading: 'Traccia spedizione' },
		{ path: '/guide', heading: 'Guide e risorse' },
		{ path: '/login', heading: 'Accedi' },
		{ path: '/registrazione', heading: 'Crea account' },
		{ path: '/recupera-password', heading: 'Recupera password' },
		{ path: '/privacy-policy', heading: 'Informativa sulla privacy' },
	];

	for (const p of pages) {
		test(`${p.path} renderizza con heading "${p.heading}"`, async ({ page }) => {
			const response = await page.goto(p.path);
			expect(response?.status()).toBe(200);
			await expect(page.getByRole('heading', { level: 1 })).toContainText(p.heading);
		});
	}
});

test.describe('Header navigazione', () => {
	test('header link Preventivo presente in homepage', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('link', { name: 'Preventivo' }).first()).toBeVisible();
	});

	test('footer link Privacy presente in homepage', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('link', { name: 'Privacy' }).first()).toBeVisible();
	});
});

test.describe('Form preventivo home', () => {
	test('form ha CAP partenza + destinazione + peso + tipo', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByPlaceholder('CAP partenza')).toBeVisible();
		await expect(page.getByPlaceholder('CAP destinazione')).toBeVisible();
		await expect(page.getByPlaceholder('Peso kg')).toBeVisible();
	});
});
