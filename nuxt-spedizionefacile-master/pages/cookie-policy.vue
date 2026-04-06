<!--
  PAGINA: Cookie Policy (cookie-policy.vue)
  Informativa sui cookie utilizzati dal sito SpediamoFacile.
  CSS condiviso: assets/css/legal.css
-->
<script setup>
useSeoMeta({
	title: 'Cookie Policy | SpediamoFacile',
	ogTitle: 'Cookie Policy | SpediamoFacile',
	description: 'Informativa sui cookie utilizzati da SpediamoFacile: tipologie, finalità e gestione delle preferenze.',
});

const lastUpdate = '31 marzo 2026';

const cookieTypes = [
	{
		name: 'Cookie tecnici (necessari)',
		required: true,
		description: 'Indispensabili per il funzionamento del sito. Consentono la navigazione, l\'autenticazione dell\'utente, la gestione del carrello e la sicurezza della sessione. Senza questi cookie il sito non può funzionare correttamente.',
		examples: 'Sessione di autenticazione, token CSRF, preferenze di lingua, stato del carrello.',
		duration: 'Sessione o massimo 12 mesi.',
	},
	{
		name: 'Cookie analitici',
		required: false,
		description: 'Utilizzati per raccogliere informazioni aggregate e anonime sull\'utilizzo del sito: pagine visitate, tempo di permanenza, provenienza del traffico. Questi dati aiutano a migliorare il servizio e l\'esperienza di navigazione.',
		examples: 'Google Analytics (con IP anonimizzato).',
		duration: 'Fino a 26 mesi.',
	},
	{
		name: 'Cookie di terze parti per pagamenti',
		required: false,
		description: 'Stripe, il nostro fornitore di pagamenti, può installare cookie tecnici necessari per elaborare le transazioni in sicurezza e prevenire frodi. Questi cookie vengono attivati solo durante il processo di pagamento.',
		examples: 'Cookie di Stripe per autenticazione 3D Secure e antifrode.',
		duration: 'Variabile, secondo la policy di Stripe.',
	},
];

const sections = [
	{
		title: 'Cosa sono i cookie',
		text: 'I cookie sono piccoli file di testo che il sito salva nel browser dell\'utente durante la navigazione. Vengono utilizzati per ricordare le preferenze, gestire l\'autenticazione e migliorare l\'esperienza di utilizzo del servizio.',
	},
	{
		title: 'Come gestire i cookie',
		text: 'Al primo accesso al sito viene mostrato un banner che consente di accettare o rifiutare i cookie non essenziali. È possibile modificare le preferenze in qualsiasi momento dalle impostazioni del browser. La disattivazione dei cookie tecnici potrebbe compromettere il funzionamento del sito. Di seguito le guide per i principali browser:',
		links: [
			{ text: 'Google Chrome', url: 'https://support.google.com/chrome/answer/95647' },
			{ text: 'Mozilla Firefox', url: 'https://support.mozilla.org/it/kb/protezione-antitracciamento-avanzata-firefox-desktop' },
			{ text: 'Safari', url: 'https://support.apple.com/it-it/guide/safari/sfri11471/mac' },
			{ text: 'Microsoft Edge', url: 'https://support.microsoft.com/it-it/microsoft-edge/eliminare-i-cookie-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09' },
		],
	},
	{
		title: 'Aggiornamenti alla presente policy',
		text: 'La presente cookie policy può essere aggiornata periodicamente per riflettere modifiche tecniche o normative. La data dell\'ultimo aggiornamento è indicata in cima alla pagina.',
	},
];
</script>

<template>
	<section class="legal-page">
		<div class="legal-page__container">
			<h1 class="legal-page__title">Cookie Policy</h1>
			<p class="legal-page__subtitle">Ultimo aggiornamento: {{ lastUpdate }}</p>

			<!-- Sezione introduttiva -->
			<div class="legal-section">
				<h2 class="legal-section__title">{{ sections[0].title }}</h2>
				<p class="legal-section__text">{{ sections[0].text }}</p>
			</div>

			<!-- Tipi di cookie -->
			<h2 class="legal-section__title legal-section__title--lg" style="margin-top: 28px; margin-bottom: 16px;">Tipi di cookie utilizzati</h2>

			<div
				v-for="(cookie, i) in cookieTypes"
				:key="'cookie-' + i"
				class="legal-section"
			>
				<div class="legal-cookie-header">
					<h3 class="legal-cookie-header__name">{{ cookie.name }}</h3>
					<span
						v-if="cookie.required"
						class="legal-badge legal-badge--active"
					>Sempre attivi</span>
					<span
						v-else
						class="legal-badge legal-badge--consent"
					>Previo consenso</span>
				</div>
				<p class="legal-section__text" style="margin-bottom: 8px;">{{ cookie.description }}</p>
				<p class="legal-detail-row"><strong>Esempi:</strong> {{ cookie.examples }}</p>
				<p class="legal-detail-row"><strong>Durata:</strong> {{ cookie.duration }}</p>
			</div>

			<!-- Sezioni gestione e aggiornamenti -->
			<div
				v-for="(section, i) in sections.slice(1)"
				:key="'section-' + i"
				class="legal-section"
			>
				<h2 class="legal-section__title">{{ section.title }}</h2>
				<p class="legal-section__text">{{ section.text }}</p>
				<ul v-if="section.links" class="legal-list">
					<li v-for="link in section.links" :key="link.url">
						<a
							:href="link.url"
							target="_blank"
							rel="noopener noreferrer"
							class="legal-link"
						>{{ link.text }}</a>
					</li>
				</ul>
			</div>

			<!-- Footer contatti -->
			<div class="legal-footer-card">
				<h2 class="legal-footer-card__title">Maggiori informazioni</h2>
				<p class="legal-footer-card__text">
					Per informazioni sul trattamento dei dati personali, consulta la nostra
					<NuxtLink to="/privacy-policy" class="legal-link">Privacy Policy</NuxtLink>.
					Per domande specifiche sui cookie, scrivi a
					<a href="mailto:privacy@spediamofacile.it" class="legal-link">privacy@spediamofacile.it</a>.
				</p>
			</div>
		</div>
	</section>
</template>
