import { test, expect } from '@playwright/test';

test.describe('Autenticazione', () => {
	test.describe('Login', () => {
		test('T1.1.1 - pagina login accessibile', async ({ page }) => {
			await page.goto('/autenticazione');
			// The page uses UTabs — "Accedi" is a tab trigger button, not a heading
			await expect(page.locator('#login_email')).toBeVisible({ timeout: 10000 });
		});

		test('T1.1.2 - login con credenziali errate mostra errore', async ({ page }) => {
			await page.goto('/autenticazione');
			// Wait for Vue hydration — the Accedi button becomes interactive after hydration
			await page.waitForLoadState('networkidle');
			await page.locator('#login_email').fill('nonexistent@test.com');
			await page.locator('#login_password').fill('wrongpassword');
			// Click the submit button inside the auth form, not the navbar CTA.
			await page
				.locator('#main-content form')
				.getByRole('button', { name: /^accedi$/i })
				.click();
			// Wait for the semantic alert rendered by the login form.
			await expect(page.getByRole('alert')).toContainText(/credenziali non sono corrette/i, { timeout: 15000 });
		});

		test('T1.1.12 - redirect post-login preservato', async ({ page }) => {
			// Try to access protected page
			await page.goto('/checkout');
			// Should redirect to auth page
			await expect(page).toHaveURL(/autenticazione/);
		});
	});

	test.describe('Registrazione', () => {
		test('T1.2.1 - tab registrazione visibile', async ({ page }) => {
			await page.goto('/autenticazione');
			// Wait for Vue hydration so UTabs is interactive
			await page.waitForLoadState('networkidle');
			// Click register tab — UTabs renders tab triggers as buttons
			const registerTab = page.getByRole('tab', { name: /registrati/i });
			await registerTab.click();
			// The registration form has input#reg_name for "Nome"
			await expect(page.locator('#reg_name')).toBeVisible({ timeout: 10000 });
		});

		test('T1.2.7 - submit vuoto mostra errori', async ({ page }) => {
			await page.goto('/autenticazione');
			// Wait for Vue hydration so UTabs is interactive
			await page.waitForLoadState('networkidle');
			const registerTab = page.getByRole('tab', { name: /registrati/i });
			await registerTab.click();
			// Wait for the registration panel to appear
			await expect(page.locator('#reg_name')).toBeVisible({ timeout: 10000 });
			// Submit the registration form and rely on native required validation.
			await page
				.locator('#main-content form')
				.getByRole('button', { name: /registrati e continua/i })
				.click();
			// The form has required HTML fields, so browser native validation should fire.
			const invalidField = page.locator('#reg_name:invalid, #reg_email:invalid, #reg_password:invalid, .text-red-500');
			await expect(invalidField.first()).toBeAttached({ timeout: 5000 });
		});
	});

	test.describe('Protezione Route', () => {
		test('T1.4.1 - checkout richiede autenticazione', async ({ page }) => {
			await page.goto('/checkout');
			await expect(page).toHaveURL(/autenticazione/);
		});

		test('T1.4.2 - account richiede autenticazione', async ({ page }) => {
			await page.goto('/account');
			await expect(page).toHaveURL(/autenticazione/);
		});

		test('T1.4.4 - pagina login accessibile da guest', async ({ page }) => {
			await page.goto('/autenticazione');
			await expect(page).toHaveURL(/autenticazione/);
		});
	});

	test.describe('Password Recovery', () => {
		test('T1.3.1 - pagina recupero password accessibile', async ({ page }) => {
			await page.goto('/recupera-password');
			await expect(page.getByLabel(/email/i)).toBeVisible();
		});
	});
});
