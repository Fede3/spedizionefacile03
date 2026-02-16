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
/* Social media - icone uniformi con MDI */
const socials = [
	{ icon: "mdi:twitter", link: "#", label: "Twitter" },
	{ icon: "mdi:facebook", link: "#", label: "Facebook" },
	{ icon: "mdi:instagram", link: "#", label: "Instagram" },
	{ icon: "mdi:linkedin", link: "#", label: "LinkedIn" },
];

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
								v-for="(social, i) in socials"
								:key="i"
								:href="social.link"
								:aria-label="social.label"
								target="_blank"
								rel="noopener noreferrer"
								class="w-[44px] h-[44px] rounded-full bg-white/10 flex items-center justify-center text-white/80 transition-[background-color,color,transform] duration-200 hover:bg-[#E44203] hover:text-white hover:scale-110 active:scale-95">
								<Icon :name="social.icon" class="text-[18px]" />
							</a>
						</div>

						<!-- Contatto rapido -->
						<div class="mt-[24px] flex flex-col gap-[8px]">
							<a href="mailto:info@spedizionefacile.it" class="flex items-center gap-[8px] text-white/70 text-[0.875rem] hover:text-white transition-colors duration-200 min-h-[44px]">
								<Icon name="mdi:email-outline" class="text-[16px]" />
								info@spedizionefacile.it
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
					&copy; {{ new Date().getFullYear() }} SpedizioneFacile. Tutti i diritti riservati. P.IVA 00000000000
				</p>
				<div class="flex items-center gap-[16px] text-white/40 text-[0.75rem]">
					<span class="flex items-center gap-[4px]">
						<Icon name="mdi:credit-card-outline" class="text-[14px]" /> Visa
					</span>
					<span class="flex items-center gap-[4px]">
						<Icon name="mdi:credit-card-outline" class="text-[14px]" /> Mastercard
					</span>
					<span class="flex items-center gap-[4px]">
						<Icon name="mdi:credit-card-outline" class="text-[14px]" /> Stripe
					</span>
				</div>
			</div>
		</div>
	</footer>
</template>
