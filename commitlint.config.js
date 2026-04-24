/**
 * commitlint configuration for SpedizioneFacile monorepo.
 *
 * Enforces Conventional Commits (https://www.conventionalcommits.org).
 * Scope-enum è la lista canonica dei domini del prodotto: aggiornarla quando
 * nasce un nuovo ambito (es. "kyc", "webhooks") invece di usarne uno generico.
 *
 * Bypass in emergenza: `git commit --no-verify` — va documentato nella PR.
 * Vedi docs/CONTRIBUTING.md per il workflow completo.
 */
module.exports = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'type-enum': [
			2,
			'always',
			[
				'feat',
				'fix',
				'chore',
				'docs',
				'refactor',
				'test',
				'perf',
				'style',
				'ci',
				'build',
				'revert',
			],
		],
		'scope-enum': [
			2,
			'always',
			[
				'auth',
				'checkout',
				'admin',
				'brt',
				'stripe',
				'ui',
				'ci',
				'deps',
				'funnel',
				'cart',
				'wallet',
				'gdpr',
				'security',
				'a11y',
				'seo',
				'perf',
				'docs',
				'tests',
				'preventivo',
				'account',
				'legal',
				'homepage',
			],
		],
		// Italiano consentito nel subject → disattiviamo il vincolo case.
		'subject-case': [0],
		// Body lungo tollerato (changelog dettagliato) ma segnalato.
		'body-max-line-length': [1, 'always', 120],
	},
};
