import { mkdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { authOutputDir, authSetupProfiles } from './utils/authState';

mkdirSync(authOutputDir, { recursive: true });

for (const profile of authSetupProfiles) {
	test(`auth setup salva storage state ${profile.name}`, async ({ page }) => {
		await page.goto('/autenticazione');
		await page.waitForLoadState('networkidle');

		await page.getByRole('button', { name: profile.buttonName }).click();
		await page.waitForLoadState('networkidle');
		await expect(page).not.toHaveURL(/autenticazione/, { timeout: 30000 });

		await page.context().storageState({ path: profile.outputFile });
	});
}
