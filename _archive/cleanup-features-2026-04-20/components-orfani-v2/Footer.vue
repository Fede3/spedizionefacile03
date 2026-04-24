<script setup>
// CSS split route-specific: il footer è l'unico consumer di footer.css.
import '~/assets/css/footer.css';

const currentYear = new Date().getFullYear();
const route = useRoute();
const reopenCookieBanner = useState('reopenCookieBanner', () => false);

// LEGAL-TODO: dati reali da inserire prima di go-live (richiesta utente).
// I valori placeholder `[INSERIRE_*]` sono configurati in `app.config.ts` -> `legal`.
// Dopo l'inserimento dei dati reali, questo blocco mostrerà automaticamente i valori corretti.
const appConfig = useAppConfig();
const rawLegal = appConfig.legal;

// Helper: nasconde i valori placeholder `[INSERIRE_*]` finche' non vengono compilati
// con dati business reali. Evita di esporre marker tecnici all'utente finale.
const isPlaceholder = (v) => typeof v === 'string' && v.startsWith('[INSERIRE_');
const safe = (v) => (isPlaceholder(v) ? '' : v);

const legal = computed(() => ({
	companyName: safe(rawLegal.companyName) || 'SpediamoFacile',
	vatNumber: safe(rawLegal.vatNumber),
	fiscalCode: safe(rawLegal.fiscalCode),
	registeredOffice: safe(rawLegal.registeredOffice),
	rea: safe(rawLegal.rea),
	shareCapital: safe(rawLegal.shareCapital),
	legalRepresentative: safe(rawLegal.legalRepresentative),
	dpoName: safe(rawLegal.dpoName),
	dpoEmail: rawLegal.dpoEmail || 'privacy@spediamofacile.it',
	supportEmail: rawLegal.supportEmail || 'info@spediamofacile.it',
	pec: safe(rawLegal.pec),
})).value;

// Costruisce la riga legale concatenando solo i campi compilati (senza placeholder vuoti).
const legalLineParts = computed(() => {
	const parts = [];
	if (legal.registeredOffice) parts.push(`Sede legale: ${legal.registeredOffice}`);
	if (legal.vatNumber) parts.push(`P.IVA ${legal.vatNumber}`);
	if (legal.rea) parts.push(`REA ${legal.rea}`);
	if (legal.shareCapital) parts.push(`Capitale sociale ${legal.shareCapital} i.v.`);
	return parts;
});

const openCookieSettings = () => {
	reopenCookieBanner.value = true;
};

const linkColumns = [
	{
		title: 'Azienda',
		pages: [
			{ text: 'Chi Siamo', url: '/chi-siamo' },
			{ text: 'Account Pro', url: '/account/account-pro' },
			{ text: 'FAQ', url: '/faq' },
		],
	},
	{
		title: 'Supporto',
		pages: [
			{ text: 'Assistenza', url: '/account/assistenza' },
			{ text: 'Contatti', url: '/contatti' },
			{ text: 'Guide', url: '/guide' },
		],
	},
	{
		title: 'Legale',
		pages: [
			{ text: 'Privacy Policy', url: '/privacy-policy' },
			{ text: 'Cookie Policy', url: '/cookie-policy' },
			{ text: 'Termini e Condizioni', url: '/termini-e-condizioni' },
		],
	},
];

const socials = [
	{ label: 'Twitter', path: 'M22.46,6C21.69,6.35 20.86,6.58 20,6.69C20.88,6.16 21.56,5.32 21.88,4.31C21.05,4.81 20.13,5.16 19.16,5.36C18.37,4.5 17.26,4 16,4C13.65,4 11.73,5.92 11.73,8.29C11.73,8.63 11.77,8.96 11.84,9.27C8.28,9.09 5.11,7.38 3,4.79C2.63,5.42 2.42,6.16 2.42,6.94C2.42,8.43 3.17,9.75 4.33,10.5C3.62,10.5 2.96,10.3 2.38,10C2.38,10 2.38,10 2.38,10.03C2.38,12.11 3.86,13.85 5.82,14.24C5.46,14.34 5.08,14.39 4.69,14.39C4.42,14.39 4.15,14.36 3.89,14.31C4.43,16 6,17.26 7.89,17.29C6.43,18.45 4.58,19.13 2.56,19.13C2.22,19.13 1.88,19.11 1.54,19.07C3.44,20.29 5.70,21 8.12,21C16,21 20.33,14.46 20.33,8.79C20.33,8.6 20.33,8.42 20.32,8.23C21.16,7.63 21.88,6.87 22.46,6Z' },
	{ label: 'Facebook', path: 'M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z' },
	{ label: 'Instagram', path: 'M7.8,2H16.2C19.4,2 22,4.6 22,7.8V16.2A5.8,5.8 0 0,1 16.2,22H7.8C4.6,22 2,19.4 2,16.2V7.8A5.8,5.8 0 0,1 7.8,2M7.6,4A3.6,3.6 0 0,0 4,7.6V16.4C4,18.39 5.61,20 7.6,20H16.4A3.6,3.6 0 0,0 20,16.4V7.6C20,5.61 18.39,4 16.4,4H7.6M17.25,5.5A1.25,1.25 0 0,1 18.5,6.75A1.25,1.25 0 0,1 17.25,8A1.25,1.25 0 0,1 16,6.75A1.25,1.25 0 0,1 17.25,5.5M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z' },
	{ label: 'LinkedIn', path: 'M19 3A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H19M18.5 18.5V13.2A3.26 3.26 0 0 0 15.24 9.94C14.39 9.94 13.4 10.46 12.92 11.24V10.13H10.13V18.5H12.92V13.57C12.92 12.8 13.54 12.17 14.31 12.17A1.4 1.4 0 0 1 15.71 13.57V18.5H18.5M6.88 8.56A1.68 1.68 0 0 0 8.56 6.88C8.56 5.95 7.81 5.19 6.88 5.19A1.69 1.69 0 0 0 5.19 6.88C5.19 7.81 5.95 8.56 6.88 8.56M8.27 18.5V10.13H5.5V18.5H8.27Z' },
];

const paymentMethods = ['Visa', 'Mastercard', 'Stripe'];
</script>

<template>
	<footer role="contentinfo" class="site-footer">
		<!-- Main section -->
		<div class="site-footer__top">
			<div class="my-container site-footer__top-shell">
				<div class="site-footer__grid">
					<!-- Left column: brand -->
					<div class="site-footer__brand-col">
						<div class="site-footer__logo-wrap">
							<Logo :is-navbar="false" />
						</div>
						<p class="site-footer__brand-copy">
							Confronta e prenota spedizioni nazionali e internazionali ai migliori prezzi.
							Ritiro a domicilio, tracking in tempo reale.
						</p>

						<!-- Social icons -->
						<div class="site-footer__social-row">
							<a
								v-for="social in socials"
								:key="social.label"
								href="#"
								:aria-label="`Seguici su ${social.label}`"
								target="_blank"
								rel="noopener noreferrer"
								class="site-footer__social-link"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
									<path :d="social.path" />
								</svg>
							</a>
						</div>

						<!-- Email supporto -->
						<div class="site-footer__email-wrap">
							<a :href="`mailto:${legal.supportEmail}`" class="site-footer__email-link">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
									<polyline points="22,6 12,13 2,6"/>
								</svg>
								<span>{{ legal.supportEmail }}</span>
							</a>
						</div>

						<!-- Email DPO / Privacy (GDPR Art. 37-38 - contatto per diritti interessato) -->
						<div class="site-footer__email-wrap">
							<a :href="`mailto:${legal.dpoEmail}`" class="site-footer__email-link" aria-label="Contatto privacy / DPO">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
								</svg>
								<span>DPO / Privacy: {{ legal.dpoEmail }}</span>
							</a>
						</div>

						<!-- Sprint 11: Newsletter GDPR-compliant (stub API, Brevo TODO) -->
						<div class="site-footer__newsletter-wrap">
							<NewsletterSignup />
						</div>
					</div>

					<!-- Right columns: link groups -->
					<div class="site-footer__links-shell">
						<section
							v-for="column in linkColumns"
							:key="column.title"
							class="site-footer__links-column"
						>
							<h3 class="site-footer__links-title">{{ column.title }}</h3>
							<ul class="site-footer__link-list">
								<li v-for="page in column.pages" :key="page.url">
									<NuxtLink :to="page.url" custom v-slot="{ href, navigate }">
										<a
											:href="href"
											class="site-footer__link-item"
											:aria-current="route.path === page.url ? 'page' : undefined"
											@click="navigate">
											{{ page.text }}
										</a>
									</NuxtLink>
								</li>
							</ul>
						</section>
					</div>
				</div>
			</div>
		</div>

		<!-- Bottom bar -->
		<div class="site-footer__bottom">
			<div class="my-container site-footer__bottom-shell">
				<!-- LEGAL: i campi business non compilati (placeholder `[INSERIRE_*]` in app.config.ts)
					 vengono nascosti automaticamente. Solo i campi popolati appaiono in produzione. -->
				<p class="site-footer__legal-copy">
						&copy; {{ currentYear }} {{ legal.companyName }}<template v-if="legalLineParts.length"> &mdash; <span v-for="(part, i) in legalLineParts" :key="i"><template v-if="i &gt; 0"> &mdash; </template>{{ part }}</span></template>
						&mdash;
						<a :href="`mailto:${legal.dpoEmail}`" class="site-footer__legal-link">Email DPO: {{ legal.dpoEmail }}</a>
						&mdash;
						Tutti i diritti riservati.
						&mdash;
						<button
							type="button"
							class="site-footer__cookie-link"
							@click="openCookieSettings"
						>Gestisci cookie</button>
					</p>
				<div class="site-footer__payments">
					<span
						v-for="name in paymentMethods"
						:key="name"
						class="site-footer__payment-pill"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
							<line x1="1" y1="10" x2="23" y2="10"/>
						</svg>
						{{ name }}
					</span>
				</div>
			</div>
		</div>
	</footer>
</template>

<!-- CSS in assets/css/footer.css -->
