<!--
  PAGINA: Servizi (servizi/index.vue)
  Landing pubblica dei servizi SpediamoFacile.
  Mobile-first: hero compatto, card leggibili e CTA immediate verso dettaglio e preventivo.
-->
<script setup>
useSeoMeta({
	title: 'Servizi di Spedizione | SpediamoFacile',
	ogTitle: 'Servizi di Spedizione | SpediamoFacile',
	description: 'Scopri i servizi di spedizione SpediamoFacile: ritiro a domicilio, senza etichetta, contrassegno, assicurazione e supporto rapido.',
	ogDescription: 'Servizi chiari, attivabili in pochi secondi e pensati per spedire meglio senza complicazioni.',
});

const fallbackServices = [
	{ title: 'Pagamento alla consegna', description: "Il corriere incassa per tuo conto e ti permette di gestire il contrassegno con opzioni chiare e riepilogo completo.", icon: 'mdi:cash-register', slug: 'pagamento-alla-consegna' },
	{ title: 'Spedizione senza etichetta', description: "Se non hai stampante, il corriere si occupa dell'etichetta al ritiro e tu mantieni il flusso rapido anche da smartphone.", icon: 'mdi:qrcode', slug: 'spedizione-senza-etichetta' },
	{ title: 'Ritiro a domicilio', description: 'Prenoti online, scegli data e indirizzo e lasci che il corriere passi direttamente da te.', icon: 'mdi:home-clock-outline', slug: 'ritiro-a-domicilio' },
	{ title: 'Assicurazione sulla spedizione', description: 'Proteggi il valore della merce con una copertura semplice da attivare e facile da capire.', icon: 'mdi:shield-check-outline', slug: 'assicurazione-spedizione' },
	{ title: 'Sponda idraulica', description: 'Per colli pesanti o voluminosi, con supporto dedicato quando il carico non è gestibile manualmente.', icon: 'mdi:forklift', slug: 'sponda-idraulica' },
	{ title: 'Spedizione programmata', description: 'Pianifica il ritiro in anticipo e organizza meglio spedizioni ricorrenti o operative.', icon: 'mdi:calendar-clock-outline', slug: 'spedizione-programmata' },
	{ title: 'Chiamata pre-consegna', description: 'Il destinatario viene avvisato prima della consegna per ridurre i tentativi a vuoto.', icon: 'mdi:phone-ring-outline', slug: 'chiamata-pre-consegna' },
	{ title: 'Assistenza rapida', description: 'Supporto veloce dal preventivo alla consegna, con risposte tracciabili e meno attrito operativo.', icon: 'mdi:headset', slug: 'assistenza-rapida' },
	{ title: 'Punti fedeltà', description: 'Ogni spedizione accumula vantaggi e ti aiuta a risparmiare sui flussi successivi.', icon: 'mdi:star-circle-outline', slug: 'punti-fedelta' },
];

const serviceIcons = {
	'mdi:cash-register': '<path d="M2,17H22V21H2V17M6.25,7H9V6H6V3H18V6H15V7H17.75C19,7 20,8 20,9.25V14.75C20,16 19,17 17.75,17H6.25C5,17 4,16 4,14.75V9.25C4,8 5,7 6.25,7M10,8V11H14V8H10M6,9.25V14.75C6,14.89 6.11,15 6.25,15H17.75C17.89,15 18,14.89 18,14.75V9.25C18,9.11 17.89,9 17.75,9H15V12H9V9H6.25C6.11,9 6,9.11 6,9.25Z"/>',
	'mdi:qrcode': '<path d="M3,11H5V13H3V11M11,5H13V9H11V5M9,11H13V15H11V13H9V11M15,11H17V13H19V11H21V13H19V15H21V19H19V21H17V19H13V21H11V17H15V15H17V13H15V11M19,19V15H17V19H19M15,3H21V9H15V3M17,5V7H19V5H17M3,3H9V9H3V3M5,5V7H7V5H5M3,15H9V21H3V15M5,17V19H7V17H5Z"/>',
	'mdi:home-clock-outline': '<path d="M10,2V4.26L12,5.59V4H21V16H17V13.97L15,14.56V16H14.5A6.5,6.5 0 0,1 8,22.5C8,22.67 8,22.84 8.03,23H2V20H4V12L10,2M7.5,10L4.18,16H9V14.5A6.5,6.5 0 0,1 7.5,10M14,18A4,4 0 0,0 10,22A4,4 0 0,0 14,26A4,4 0 0,0 18,22A4,4 0 0,0 14,18M14,20.5A1.5,1.5 0 0,1 15.5,22A1.5,1.5 0 0,1 14,23.5A1.5,1.5 0 0,1 12.5,22A1.5,1.5 0 0,1 14,20.5Z"/>',
	'mdi:shield-check-outline': '<path d="M21,11C21,16.55 17.16,21.74 12,23C6.84,21.74 3,16.55 3,11V5L12,1L21,5V11M12,21C15.75,20 19,15.54 19,11.22V6.3L12,3.18L5,6.3V11.22C5,15.54 8.25,20 12,21M10,14.17L7.83,12L6.41,13.41L10,17L17.59,9.41L16.17,8L10,14.17Z"/>',
	'mdi:forklift': '<path d="M6,4V11H4C2.89,11 2,11.89 2,13V17A3,3 0 0,0 5,20A3,3 0 0,0 8,17H10A3,3 0 0,0 13,20A3,3 0 0,0 16,17V13L13,4H6M13,8A1,1 0 0,1 14,9A1,1 0 0,1 13,10A1,1 0 0,1 12,9A1,1 0 0,1 13,8M17,5H22V7H19V17H17V5M5,15.5A1.5,1.5 0 0,1 6.5,17A1.5,1.5 0 0,1 5,18.5A1.5,1.5 0 0,1 3.5,17A1.5,1.5 0 0,1 5,15.5M13,15.5A1.5,1.5 0 0,1 14.5,17A1.5,1.5 0 0,1 13,18.5A1.5,1.5 0 0,1 11.5,17A1.5,1.5 0 0,1 13,15.5Z"/>',
	'mdi:calendar-clock-outline': '<path d="M6,1V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H11.1C12.36,22.24 14.09,23 16,23A7,7 0 0,0 23,16C23,14.21 22.32,12.58 21.18,11.36L21,5C21,3.89 20.1,3 19,3H18V1H16V3H8V1H6M5,5H19V7H5V5M5,9H19V10.1C18.24,9.42 17.17,9 16,9A7,7 0 0,0 9,16C9,17.17 9.42,18.24 10.1,19H5V9M16,11A5,5 0 0,1 21,16A5,5 0 0,1 16,21A5,5 0 0,1 11,16A5,5 0 0,1 16,11M15,13V17L18,18.5L18.75,17.25L16.5,16.15V13H15Z"/>',
	'mdi:phone-ring-outline': '<path d="M4,7C2.89,7 2,7.89 2,9V15A2,2 0 0,0 4,17H6L8,19V17H20A2,2 0 0,0 22,15V9C22,7.89 21.1,7 20,7H4M4,9H20V15H7.17L6,16.17V15H4V9M16.75,11.69L15.34,10.28L12,13.62L10.66,12.28L9.25,13.69L12,16.44L16.75,11.69Z"/>',
	'mdi:headset': '<path d="M12,1C7,1 3,5 3,10V17A3,3 0 0,0 6,20H9V12H5V10A7,7 0 0,1 12,3A7,7 0 0,1 19,10V12H15V20H18A3,3 0 0,0 21,17V10C21,5 16.97,1 12,1Z"/>',
	'mdi:star-circle-outline': '<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6L9.14,11.14L4,12L7.86,15.14L7.14,20L12,17.77L16.86,20L16.14,15.14L20,12L14.86,11.14L12,6Z"/>',
};

const serviceMeta = {
	'pagamento-alla-consegna': { badge: 'Più richiesto', chips: ['Incasso gestito', 'Riepilogo chiaro'] },
	'spedizione-senza-etichetta': { badge: 'Zero stampante', chips: ['QR o ritiro diretto', 'Attivazione rapida'] },
	'ritiro-a-domicilio': { badge: 'Incluso nel flusso', chips: ['Data programmabile', 'Meno movimenti'] },
	'assicurazione-spedizione': { badge: 'Protezione extra', chips: ['Fino al valore dichiarato', 'Attiva in pochi click'] },
	'sponda-idraulica': { badge: 'Colli pesanti', chips: ['Supporto al carico', 'Riduce attrito operativo'] },
	'assistenza-rapida': { badge: 'Supporto', chips: ['Risposte veloci', 'Canali tracciabili'] },
};

const sanctum = useSanctumClient();
const services = ref(fallbackServices);

onMounted(async () => {
	try {
		const res = await sanctum('/api/public/services');
		const data = res?.data || res;
		if (Array.isArray(data) && data.length > 0) {
			services.value = data;
		}
	} catch {
		// Fallback locale: il layout resta stabile anche se l'API non è disponibile.
	}
});

const getServiceLink = (service) => `/servizi/${service.slug}`;
const getServiceSvg = (service) => serviceIcons[service.icon || ''] || serviceIcons['mdi:headset'];
const getServiceMeta = (service) => serviceMeta[service.slug] || { badge: 'Servizio', chips: ['Flusso guidato', 'Configurazione chiara'] };
const getServiceDescription = (service) => service.description || service.meta_description || service.intro || '';
</script>

<template>
	<div class="services-page-shell">
		<!-- Hero -->
		<section class="services-section services-section--white">
			<div class="my-container">
				<div class="services-intro-panel">
					<div class="services-intro-panel__copy">
						<p class="services-intro-panel__eyebrow">I nostri servizi</p>
						<h1 class="services-intro-panel__title">Ogni opzione è chiara, leggibile e pronta a rientrare nel tuo flusso di spedizione.</h1>
						<p class="services-intro-panel__text">Dalla stampa etichetta al contrassegno, fino al ritiro a domicilio e alla copertura assicurativa: qui trovi un catalogo semplice da orientare anche da smartphone.</p>
					</div>

					<div class="services-intro-panel__actions">
						<NuxtLink to="/preventivo" class="btn-cta btn-compact">
							Vai al preventivo
						</NuxtLink>
						<NuxtLink to="/contatti" class="btn-secondary btn-compact">
							Parla con noi
						</NuxtLink>
					</div>
				</div>

				<div class="services-quick-pills">
					<span class="services-quick-pill">Ritiro a domicilio</span>
					<span class="services-quick-pill">Attivazione in pochi click</span>
					<span class="services-quick-pill">Supporto rapido</span>
				</div>
			</div>
		</section>

		<!-- Grid servizi -->
		<section class="services-section services-section--alt">
			<div class="my-container">
				<div class="services-grid">
					<NuxtLink
						v-for="service in services"
						:key="service.slug"
						:to="getServiceLink(service)"
						class="service-spotlight-card"
					>
						<div class="service-spotlight-card__top">
							<span class="service-spotlight-card__icon-shell">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="service-spotlight-card__icon" fill="currentColor" v-html="getServiceSvg(service)"></svg>
							</span>
							<span class="service-spotlight-card__badge">{{ getServiceMeta(service).badge }}</span>
						</div>

						<div class="service-spotlight-card__body">
							<h3 class="service-spotlight-card__title">{{ service.title }}</h3>
							<p class="service-spotlight-card__text">{{ getServiceDescription(service) }}</p>
						</div>

						<div class="service-spotlight-card__chips">
							<span v-for="chip in getServiceMeta(service).chips" :key="chip" class="service-spotlight-card__chip">{{ chip }}</span>
						</div>

						<div class="service-spotlight-card__footer">
							<span>Scopri il servizio</span>
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
						</div>
					</NuxtLink>
				</div>
			</div>
		</section>

		<!-- CTA finale -->
		<section class="services-section services-section--white">
			<div class="my-container">
				<div class="services-bottom-cta">
					<div class="services-bottom-cta__copy">
						<p class="services-intro-panel__eyebrow">Prossimo passo</p>
						<h2 class="services-bottom-cta__title">Non trovi quello che cerchi?</h2>
						<p class="services-bottom-cta__text">Calcola un preventivo per scoprire tutti i servizi disponibili per la tua spedizione, oppure contattaci per un caso operativo specifico.</p>
					</div>
					<div class="services-bottom-cta__actions">
						<NuxtLink to="/preventivo" class="btn-cta btn-compact">
							Calcola il preventivo
						</NuxtLink>
						<NuxtLink to="/contatti" class="btn-secondary btn-compact">
							Parla con noi
						</NuxtLink>
					</div>
				</div>
			</div>
		</section>
	</div>
</template>

<!-- CSS in assets/css/servizi.css -->
