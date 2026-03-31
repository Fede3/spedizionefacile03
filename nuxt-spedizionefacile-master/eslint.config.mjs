import { createConfigForNuxt } from '@nuxt/eslint-config/flat';

export default createConfigForNuxt({
	features: {
		tooling: true,
	},
}).append({
	// Nuxt auto-imports: questi composable/helper vengono iniettati automaticamente
	// e non servono import espliciti. Li dichiariamo come globals per ESLint.
	languageOptions: {
		globals: {
			useSanctumClient: 'readonly',
			useSanctumAuth: 'readonly',
			useSanctumFetch: 'readonly',
			defineNuxtRouteMiddleware: 'readonly',
			navigateTo: 'readonly',
		},
	},
	rules: {
		// Vieta console.log/error/debug; permetti solo console.warn
		'no-console': ['warn', { allow: ['warn'] }],
		// Vue specifiche
		'vue/multi-word-component-names': 'off',
		'vue/no-multiple-template-root': 'off',
		// Rilassa per compatibilità con codice esistente
		'vue/require-default-prop': 'off',
		'vue/no-v-html': 'warn',
		// Catch vuoti tollerati dove il commento spiega il perché
		'no-empty': ['error', { allowEmptyCatch: true }],
	},
});
