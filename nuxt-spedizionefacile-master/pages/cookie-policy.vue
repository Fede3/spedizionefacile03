<!--
  PAGINA: Cookie Policy (cookie-policy.vue)
  Informativa sui cookie utilizzati dal sito SpediamoFacile.
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
	<section class="min-h-[500px] py-[40px] desktop:py-[60px]">
		<div class="my-container max-w-[800px]">
			<h1 class="text-[2rem] font-bold text-[#252B42] mb-[8px]">Cookie Policy</h1>
			<p class="text-[#737373] text-[0.875rem] mb-[32px]">Ultimo aggiornamento: {{ lastUpdate }}</p>

			<!-- Sezione introduttiva -->
			<div
				v-for="(section, i) in sections.slice(0, 1)"
				:key="'intro-' + i"
				class="bg-white rounded-[12px] border border-[#E9EBEC] p-[24px] mb-[24px]"
			>
				<h2 class="text-[1.125rem] font-semibold text-[#252B42] mb-[12px]">{{ section.title }}</h2>
				<p class="text-[#737373] text-[0.9375rem] leading-[1.8]">{{ section.text }}</p>
			</div>

			<!-- Tabella tipi di cookie -->
			<h2 class="text-[1.25rem] font-semibold text-[#252B42] mb-[16px]">Tipi di cookie utilizzati</h2>
			<div class="space-y-[16px] mb-[24px]">
				<div
					v-for="(cookie, i) in cookieTypes"
					:key="i"
					class="bg-white rounded-[12px] border border-[#E9EBEC] p-[24px]"
				>
					<div class="flex items-center gap-[8px] mb-[12px]">
						<h3 class="text-[1rem] font-semibold text-[#252B42]">{{ cookie.name }}</h3>
						<span
							v-if="cookie.required"
							class="text-[0.75rem] font-medium px-[8px] py-[2px] rounded-full bg-[#095866]/10 text-[#095866]"
						>Sempre attivi</span>
						<span
							v-else
							class="text-[0.75rem] font-medium px-[8px] py-[2px] rounded-full bg-[#F3F4F6] text-[#737373]"
						>Previo consenso</span>
					</div>
					<p class="text-[#737373] text-[0.9375rem] leading-[1.8] mb-[8px]">{{ cookie.description }}</p>
					<div class="text-[0.8125rem] text-[#A0A5AB] space-y-[4px]">
						<p><span class="font-medium text-[#737373]">Esempi:</span> {{ cookie.examples }}</p>
						<p><span class="font-medium text-[#737373]">Durata:</span> {{ cookie.duration }}</p>
					</div>
				</div>
			</div>

			<!-- Sezioni gestione e aggiornamenti -->
			<div
				v-for="(section, i) in sections.slice(1)"
				:key="'section-' + i"
				class="bg-white rounded-[12px] border border-[#E9EBEC] p-[24px] mb-[24px]"
			>
				<h2 class="text-[1.125rem] font-semibold text-[#252B42] mb-[12px]">{{ section.title }}</h2>
				<p class="text-[#737373] text-[0.9375rem] leading-[1.8]">{{ section.text }}</p>
				<ul v-if="section.links" class="mt-[12px] space-y-[6px]">
					<li v-for="link in section.links" :key="link.url">
						<a
							:href="link.url"
							target="_blank"
							rel="noopener noreferrer"
							class="text-[#095866] text-[0.875rem] hover:underline"
						>{{ link.text }}</a>
					</li>
				</ul>
			</div>

			<!-- Footer contatti -->
			<div class="bg-[#F9FAFB] rounded-[12px] border border-[#E9EBEC] p-[24px]">
				<h2 class="text-[1rem] font-semibold text-[#252B42] mb-[8px]">Maggiori informazioni</h2>
				<p class="text-[#737373] text-[0.9375rem] leading-[1.8]">
					Per informazioni sul trattamento dei dati personali, consulta la nostra
					<NuxtLink to="/privacy-policy" class="text-[#095866] hover:underline">Privacy Policy</NuxtLink>.
					Per domande specifiche sui cookie, scrivi a
					<a href="mailto:privacy@spediamofacile.it" class="text-[#095866] hover:underline">privacy@spediamofacile.it</a>.
				</p>
			</div>
		</div>
	</section>
</template>
