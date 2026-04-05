import { test, expect, type Page, type Route } from '@playwright/test';

const fillLocationField = async (page: Page, selector: string, value: string) => {
	const input = page.locator(selector);
	await expect(input).toBeVisible();
	await input.fill(value);
	await page.waitForTimeout(900);

	const suggestions = page.locator('ul[role="listbox"] li[role="option"]');
	const hasSuggestions = await suggestions
		.first()
		.isVisible({ timeout: 2500 })
		.catch(() => false);

	if (hasSuggestions) {
		await suggestions.first().click();
	} else {
		await input.press('ArrowDown').catch(() => {});
		await input.press('Enter').catch(() => {});
	}

	await input.blur();
	await page.waitForTimeout(250);
};

const installShipmentFlowMocks = async (page: Page) => {
	let csrfRequestCount = 0;
	let firstStepRequestCount = 0;
	let secondStepRequestCount = 0;
	const mockedLocations = [
		{
			place_name: 'Roma',
			postal_code: '00118',
			province: 'RM',
			country_code: 'IT',
			country_name: 'Italia',
		},
		{
			place_name: 'Milano',
			postal_code: '20121',
			province: 'MI',
			country_code: 'IT',
			country_name: 'Italia',
		},
	];
	let sessionPayload: Record<string, any> = {
		data: {
			shipment_details: {},
			packages: [],
			services: null,
			total_price: 0,
			step: 1,
		},
	};

	await page.route('**/sanctum/csrf-cookie', async (route: Route) => {
		csrfRequestCount += 1;
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ ok: true }),
		});
	});

	await page.route('**/api/locations/by-city?**', async (route: Route) => {
		const url = new URL(route.request().url());
		const city = (url.searchParams.get('city') || '').trim().toLowerCase();
		const matches = mockedLocations.filter((location) => location.place_name.toLowerCase().startsWith(city));

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(matches),
		});
	});

	await page.route('**/api/locations/search?**', async (route: Route) => {
		const url = new URL(route.request().url());
		const query = (url.searchParams.get('q') || '').trim().toLowerCase();
		const matches = mockedLocations.filter(
			(location) =>
				location.place_name.toLowerCase().includes(query) || location.postal_code.startsWith(query),
		);

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(matches),
		});
	});

	await page.route('**/api/locations/by-cap?**', async (route: Route) => {
		const url = new URL(route.request().url());
		const cap = (url.searchParams.get('cap') || '').trim();
		const matches = mockedLocations.filter((location) => location.postal_code.startsWith(cap));

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(matches),
		});
	});

	await page.route('**/api/session/first-step', async (route: Route) => {
		firstStepRequestCount += 1;
		const requestBody = route.request().postDataJSON();
		sessionPayload = {
			data: {
				shipment_details: requestBody.shipment_details,
				packages: requestBody.packages.map((pack: Record<string, unknown>) => ({
					...pack,
					weight_price: 8.5,
					volume_price: 7.25,
					single_price: 8.5,
				})),
				services: null,
				total_price: 8.5,
				step: 2,
			},
		};

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(sessionPayload),
		});
	});

	await page.route('**/api/session/second-step', async (route: Route) => {
		secondStepRequestCount += 1;
		const requestBody = route.request().postDataJSON();

		sessionPayload = {
			data: {
				...sessionPayload.data,
				services: requestBody.services,
				content_description: requestBody.content_description,
				pickup_date: requestBody.pickup_date,
				origin_address: requestBody.origin_address ?? sessionPayload.data.origin_address ?? null,
				destination_address: requestBody.destination_address ?? sessionPayload.data.destination_address ?? null,
				delivery_mode: requestBody.delivery_mode ?? 'home',
				selected_pudo: requestBody.selected_pudo ?? null,
				step: requestBody.origin_address && requestBody.destination_address ? 3 : 2,
			},
		};

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(sessionPayload),
		});
	});

	await page.route('**/api/session', async (route: Route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(sessionPayload),
		});
	});

	return {
		getCounts: () => ({
			csrfRequestCount,
			firstStepRequestCount,
			secondStepRequestCount,
		}),
	};
};

const advanceQuoteToServicesStep = async (
	page: Page,
	mockState: { getCounts: () => { csrfRequestCount: number; firstStepRequestCount: number } },
) => {
	await page.goto('/preventivo');
	await page.waitForLoadState('networkidle');

	await fillLocationField(page, '#origin_city', 'Roma');
	await fillLocationField(page, '#destination_city', 'Milano');

	await page.getByRole('button', { name: /^Pacco$/ }).click();
	await page.waitForTimeout(500);

	await page.locator('#weight_0').fill('5');
	await page.locator('#first_size_0').fill('30');
	await page.locator('#second_size_0').fill('20');
	await page.locator('#third_size_0').fill('15');
	await page.locator('#third_size_0').blur();
	await page.waitForTimeout(300);

	const continuaBtn = page.locator('button', { hasText: /Calcola il prezzo|Vai ai servizi|Continua/ }).first();
	await expect(continuaBtn).toBeVisible();
	await continuaBtn.click();

	await expect.poll(() => mockState.getCounts().csrfRequestCount).toBe(1);
	await expect.poll(() => mockState.getCounts().firstStepRequestCount).toBe(1);
	await page.waitForURL(/\/la-tua-spedizione\/2/, { timeout: 10000 });
	await expect(page).toHaveURL(/\/la-tua-spedizione\/2/);
};

test.describe('Flusso Spedizione', () => {
	test('T3.1 - pagina preventivo carica correttamente', async ({ page }) => {
		const response = await page.goto('/preventivo');
		expect(response?.status()).toBeLessThan(400);

		await page.waitForLoadState('networkidle');

		// The Preventivo component should be rendered
		await expect(page.locator('h2', { hasText: 'Preventivo Rapido' })).toBeVisible({ timeout: 10000 });
	});

	test('T3.2 - step 1 ha tutti i campi necessari', async ({ page }) => {
		await page.goto('/preventivo');
		await page.waitForLoadState('networkidle');

		// Address fields
		await expect(page.locator('#origin_city')).toBeVisible();
		await expect(page.locator('#destination_city')).toBeVisible();
		await expect(page.locator('#origin_country_code')).toBeVisible();
		await expect(page.locator('#destination_country_code')).toBeVisible();

		// Package type selector
		await expect(page.getByRole('button', { name: /^Pacco$/ })).toBeVisible();
		await expect(page.getByRole('button', { name: /^Pallet$/ })).toBeVisible();
		await expect(page.getByRole('button', { name: /^Valigia$/ })).toBeVisible();
	});

	test('T3.2.11 - accesso diretto step 3 senza step 2 redirige', async ({ page }) => {
		await page.goto('/la-tua-spedizione/3');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/preventivo/, { timeout: 10000 });
	});

	test('T3.3 - pagina servizi step 2 non accessibile direttamente', async ({ page }) => {
		await page.goto('/la-tua-spedizione/2');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/preventivo/, { timeout: 10000 });
	});

	test('T3.4 - pagina riepilogo carica', async ({ page }) => {
		const response = await page.goto('/riepilogo');
		await page.waitForLoadState('networkidle');

		// Page should load without server errors
		expect(response?.status()).toBeLessThan(500);
	});

	test('T3.5 - flusso completo step 1 compilazione form', async ({ page }) => {
		await page.goto('/preventivo');
		await page.waitForLoadState('networkidle');

		await fillLocationField(page, '#origin_city', 'Roma');
		await fillLocationField(page, '#destination_city', 'Milano');

		// Add a package
		await page.getByRole('button', { name: /^Pacco$/ }).click();
		await page.waitForTimeout(500);

		// Fill dimensions
		await page.locator('#weight_0').fill('5');
		await page.locator('#first_size_0').fill('30');
		await page.locator('#second_size_0').fill('20');
		await page.locator('#third_size_0').fill('15');

		// All fields should be filled
		await expect(page.locator('#origin_city')).not.toHaveValue('');
		await expect(page.locator('#destination_city')).not.toHaveValue('');
		await expect(page.locator('#weight_0')).toHaveValue('5');
		await expect(page.locator('#first_size_0')).toHaveValue('30');
		await expect(page.locator('#second_size_0')).toHaveValue('20');
		await expect(page.locator('#third_size_0')).toHaveValue('15');
	});

	test('T3.6 - click Continua con form completo (richiede backend)', async ({ page }) => {
		const mockState = await installShipmentFlowMocks(page);
		await advanceQuoteToServicesStep(page, mockState);
	});

	test('T3.6.1 - step 2 apre davvero il pannello indirizzi a fisarmonica', async ({ page }) => {
		const mockState = await installShipmentFlowMocks(page);
		await advanceQuoteToServicesStep(page, mockState);

		const servicesTrigger = page.locator('[data-accordion-trigger="services"]');
		const addressesTrigger = page.locator('[data-accordion-trigger="addresses"]');

		await expect(servicesTrigger).toHaveAttribute('aria-expanded', 'true');
		await expect(addressesTrigger).toHaveAttribute('aria-expanded', 'false');
		await page.screenshot({
			path: 'output/playwright/shipment-step2-accordion-preview-20260404.png',
			fullPage: true,
		});

		await page.locator('#content_description').fill('Documenti e accessori');
		await page.locator('[data-pickup-day]').first().click();
		await page.getByRole('button', { name: 'Continua agli indirizzi' }).click();

		await expect.poll(() => mockState.getCounts().secondStepRequestCount).toBe(1);
		await expect(page).toHaveURL(/step=ritiro/, { timeout: 10000 });
		await expect(servicesTrigger).toHaveAttribute('aria-expanded', 'false');
		await expect(addressesTrigger).toHaveAttribute('aria-expanded', 'true');
		await expect(page.locator('#name')).toBeVisible();
		await page.screenshot({
			path: 'output/playwright/shipment-step3-accordion-preview-20260404.png',
			fullPage: true,
		});
	});

	test('T3.7 - homepage naviga correttamente al preventivo', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Homepage has the Preventivo component embedded
		await expect(page.locator('h2', { hasText: 'Preventivo Rapido' })).toBeVisible({ timeout: 10000 });

		// Fill some data and verify interaction works on homepage too
		await page.locator('#origin_city').fill('Torino');
		await expect(page.locator('#origin_city')).toHaveValue('Torino');
	});
});
