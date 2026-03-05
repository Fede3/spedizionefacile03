<!--
	COMPONENTE: Footer (Footer.vue)
	SCOPO: Pie' di pagina del sito, visibile in fondo a ogni pagina.

	DOVE SI USA: layouts/default.vue (layout principale)
	PROPS: nessuna
	EMITS: nessuno

	DATI IN INGRESSO: nessuno (dati statici)
	DATI IN USCITA: nessuno (solo visualizzazione e navigazione)

	VINCOLI: usare content-visibility: auto (classe .cv-auto) per non bloccare il rendering
	PUNTI DI MODIFICA SICURI: socials (link social media), linkColumns (colonne di link)
	COLLEGAMENTI: components/Logo.vue

	STRUTTURA (3 sezioni):
	1. Parte superiore: logo + descrizione + social + 4 colonne di link
	2. Separatore con CTA "Pronto a spedire?" + pulsante preventivo
	3. Parte inferiore: copyright + P.IVA + metodi di pagamento
-->
<script setup>
// Fix hydration mismatch: anno corrente caricato solo client-side
const currentYear = ref(new Date().getFullYear());

/* Colonne di link organizzate per categoria */
const linkColumns = [
	{
		title: "Spedizioni",
		pages: [
			{ text: "Preventivo Rapido", url: "/preventivo" },
			{ text: "I Nostri Servizi", url: "/servizi" },
			{ text: "Contrassegno", url: "/servizi/pagamento-alla-consegna" },
			{ text: "Traccia Spedizione", url: "/traccia-spedizione" },
			{ text: "Guide", url: "/guide" },
		],
	},
	{
		title: "Azienda",
		pages: [
			{ text: "Chi Siamo", url: "/chi-siamo" },
			{ text: "Contatti", url: "/contatti" },
			{ text: "Account Pro", url: "/account/account-pro" },
			{ text: "FAQ", url: "/faq" },
		],
	},
	{
		title: "Supporto",
		pages: [
			{ text: "Assistenza", url: "/account/assistenza" },
			{ text: "Reclami", url: "/reclami" },
		],
	},
	{
		title: "Legale",
		pages: [
			{ text: "Privacy Policy", url: "/privacy-policy" },
			{ text: "Cookie Policy", url: "/cookie-policy" },
			{ text: "Termini e Condizioni", url: "/termini-condizioni" },
		],
	},
];
</script>

<template>
	<!-- content-visibility: auto — il footer è sempre below-the-fold, il browser può saltare il rendering iniziale -->
	<footer role="contentinfo" class="cv-auto">
		<!-- Sezione principale del footer: sfondo scuro (brand primary) -->
		<div class="bg-[#095866] text-white">
			<div class="my-container pt-[48px] tablet:pt-[64px] pb-[40px] tablet:pb-[56px]">
				<!-- Riga superiore: Logo + descrizione a sinistra, colonne link a destra -->
				<div class="grid grid-cols-1 desktop:grid-cols-[1fr_2fr] gap-[48px] desktop:gap-[80px]">

					<!-- Colonna sinistra: Logo, descrizione, social -->
					<div>
						<!-- Logo bianco -->
						<div class="flex items-center h-[38px] tablet:h-[50px]">
							<Logo :is-navbar="false" />
						</div>

						<!-- Breve descrizione del sito -->
						<p class="text-white/70 text-[0.875rem] leading-[1.6] mt-[20px] max-w-[320px]">
							Confronta e prenota spedizioni nazionali e internazionali ai migliori prezzi.
							Ritiro a domicilio, tracking in tempo reale.
						</p>

						<!-- Icone social media -->
						<div class="flex items-center gap-[12px] mt-[24px]">
							<a
								href="#"
								aria-label="Twitter"
								target="_blank"
								rel="noopener noreferrer"
								class="w-[44px] h-[44px] rounded-full bg-white/10 flex items-center justify-center text-white/80 transition-[background-color,color,transform] duration-200 hover:bg-[#E44203] hover:text-white hover:scale-110 active:scale-95">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
									<path d="M22.46,6C21.69,6.35 20.86,6.58 20,6.69C20.88,6.16 21.56,5.32 21.88,4.31C21.05,4.81 20.13,5.16 19.16,5.36C18.37,4.5 17.26,4 16,4C13.65,4 11.73,5.92 11.73,8.29C11.73,8.63 11.77,8.96 11.84,9.27C8.28,9.09 5.11,7.38 3,4.79C2.63,5.42 2.42,6.16 2.42,6.94C2.42,8.43 3.17,9.75 4.33,10.5C3.62,10.5 2.96,10.3 2.38,10C2.38,10 2.38,10 2.38,10.03C2.38,12.11 3.86,13.85 5.82,14.24C5.46,14.34 5.08,14.39 4.69,14.39C4.42,14.39 4.15,14.36 3.89,14.31C4.43,16 6,17.26 7.89,17.29C6.43,18.45 4.58,19.13 2.56,19.13C2.22,19.13 1.88,19.11 1.54,19.07C3.44,20.29 5.70,21 8.12,21C16,21 20.33,14.46 20.33,8.79C20.33,8.6 20.33,8.42 20.32,8.23C21.16,7.63 21.88,6.87 22.46,6Z"/>
								</svg>
							</a>
							<a
								href="#"
								aria-label="Facebook"
								target="_blank"
								rel="noopener noreferrer"
								class="w-[44px] h-[44px] rounded-full bg-white/10 flex items-center justify-center text-white/80 transition-[background-color,color,transform] duration-200 hover:bg-[#E44203] hover:text-white hover:scale-110 active:scale-95">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
									<path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/>
								</svg>
							</a>
							<a
								href="#"
								aria-label="Instagram"
								target="_blank"
								rel="noopener noreferrer"
								class="w-[44px] h-[44px] rounded-full bg-white/10 flex items-center justify-center text-white/80 transition-[background-color,color,transform] duration-200 hover:bg-[#E44203] hover:text-white hover:scale-110 active:scale-95">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
									<path d="M7.8,2H16.2C19.4,2 22,4.6 22,7.8V16.2A5.8,5.8 0 0,1 16.2,22H7.8C4.6,22 2,19.4 2,16.2V7.8A5.8,5.8 0 0,1 7.8,2M7.6,4A3.6,3.6 0 0,0 4,7.6V16.4C4,18.39 5.61,20 7.6,20H16.4A3.6,3.6 0 0,0 20,16.4V7.6C20,5.61 18.39,4 16.4,4H7.6M17.25,5.5A1.25,1.25 0 0,1 18.5,6.75A1.25,1.25 0 0,1 17.25,8A1.25,1.25 0 0,1 16,6.75A1.25,1.25 0 0,1 17.25,5.5M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z"/>
								</svg>
							</a>
							<a
								href="#"
								aria-label="LinkedIn"
								target="_blank"
								rel="noopener noreferrer"
								class="w-[44px] h-[44px] rounded-full bg-white/10 flex items-center justify-center text-white/80 transition-[background-color,color,transform] duration-200 hover:bg-[#E44203] hover:text-white hover:scale-110 active:scale-95">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
									<path d="M19 3A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H19M18.5 18.5V13.2A3.26 3.26 0 0 0 15.24 9.94C14.39 9.94 13.4 10.46 12.92 11.24V10.13H10.13V18.5H12.92V13.57C12.92 12.8 13.54 12.17 14.31 12.17A1.4 1.4 0 0 1 15.71 13.57V18.5H18.5M6.88 8.56A1.68 1.68 0 0 0 8.56 6.88C8.56 5.95 7.81 5.19 6.88 5.19A1.69 1.69 0 0 0 5.19 6.88C5.19 7.81 5.95 8.56 6.88 8.56M8.27 18.5V10.13H5.5V18.5H8.27Z"/>
								</svg>
							</a>
						</div>

						<!-- Contatto rapido -->
						<div class="mt-[24px] flex flex-col gap-[8px]">
							<a href="mailto:info@spediamofacile.it" class="flex items-center gap-[8px] text-white/70 text-[0.875rem] hover:text-white transition-colors duration-200 min-h-[44px]">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
									<polyline points="22,6 12,13 2,6"/>
								</svg>
								info@spediamofacile.it
							</a>
						</div>
					</div>

					<!-- Colonna destra: 4 colonne di link -->
					<div class="grid grid-cols-2 tablet:grid-cols-4 gap-y-[36px] gap-x-[20px]">
						<div v-for="(col, colIndex) in linkColumns" :key="colIndex">
							<!-- Titolo colonna con linea decorativa sotto -->
							<h3 class="text-white font-semibold text-[1rem] mb-[16px] pb-[8px] border-b border-white/20">
								{{ col.title }}
							</h3>
							<ul class="flex flex-col gap-[2px] tablet:gap-[10px]">
								<li v-for="(page, pageIndex) in col.pages" :key="pageIndex">
									<NuxtLink
										:to="page.url"
										class="text-white/70 text-[0.875rem] hover:text-[#E44203] transition-colors duration-200 inline-flex items-center py-[8px] tablet:py-[4px] min-h-[44px] tablet:min-h-0">
										{{ page.text }}
									</NuxtLink>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- CTA banner: invito all'azione prima del copyright -->
		<div class="bg-[#074a56]">
			<div class="my-container py-[20px] flex flex-col tablet:flex-row items-center justify-between gap-[12px]">
				<p class="text-white/90 text-[0.9375rem] font-medium">
					Pronto a spedire? Calcola il tuo preventivo in 30 secondi.
				</p>
				<NuxtLink
					to="/preventivo"
					class="bg-[#E44203] text-white px-[24px] py-[12px] tablet:py-[10px] rounded-full text-[0.875rem] font-semibold hover:bg-[#c93800] transition-[background-color,box-shadow,transform] duration-200 hover:shadow-[0_4px_12px_rgba(228,66,3,0.4)] whitespace-nowrap min-h-[48px] w-full tablet:w-auto flex items-center justify-center active:scale-[0.97]">
					Preventivo Gratuito
				</NuxtLink>
			</div>
		</div>

		<!-- Barra inferiore: copyright + metodi pagamento -->
		<div class="bg-[#052f38]">
			<div class="my-container py-[16px] flex flex-col tablet:flex-row items-center justify-between gap-[8px]">
				<p class="text-white text-[0.75rem] text-center tablet:text-left">
					&copy; {{ currentYear }} SpediamoFacile. Tutti i diritti riservati. P.IVA 00000000000
				</p>
				<div class="flex items-center gap-[16px] text-white/40 text-[0.75rem]">
					<span class="flex items-center gap-[4px]">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
							<line x1="1" y1="10" x2="23" y2="10"/>
						</svg>
						Visa
					</span>
					<span class="flex items-center gap-[4px]">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
							<line x1="1" y1="10" x2="23" y2="10"/>
						</svg>
						Mastercard
					</span>
					<span class="flex items-center gap-[4px]">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
							<line x1="1" y1="10" x2="23" y2="10"/>
						</svg>
						Stripe
					</span>
				</div>
			</div>
		</div>
	</footer>
</template>
