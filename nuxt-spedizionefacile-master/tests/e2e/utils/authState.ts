import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const firstValue = (...values: Array<string | undefined | null>) =>
	values.map((value) => value?.trim()).find((value): value is string => Boolean(value)) || '';

export const authOutputDir = resolve(process.cwd(), 'output/playwright/auth');

export const authStateFiles = {
	customer: resolve(authOutputDir, 'customer.json'),
	pro: resolve(authOutputDir, 'pro.json'),
	admin: resolve(authOutputDir, 'admin.json'),
} as const;

export const authSetupProfiles = [
	{
		name: 'cliente',
		buttonName: /cliente account base/i,
		outputFile: authStateFiles.customer,
	},
	{
		name: 'partner-pro',
		buttonName: /cliente pro funzioni avanzate/i,
		outputFile: authStateFiles.pro,
	},
	{
		name: 'admin',
		buttonName: /admin accesso completo/i,
		outputFile: authStateFiles.admin,
	},
] as const;

export const resolveE2EStorageState = (profile: 'account' | 'admin') => {
	const configured = firstValue(process.env.PLAYWRIGHT_STORAGE_STATE, process.env.TEST_STORAGE_STATE);
	if (configured) {
		return configured;
	}

	const candidates = profile === 'admin'
		? [authStateFiles.admin]
		: [authStateFiles.customer, authStateFiles.pro, authStateFiles.admin];

	return candidates.find((candidate) => existsSync(candidate)) || '';
};
