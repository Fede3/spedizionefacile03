<!--
  PAGINA: Servizi (servizi/index.vue)
  Pagina che elenca tutti i servizi offerti da SpediamoFacile.
  Carica i servizi dall'API pubblica /api/public/services, con fallback hardcoded.
  Mostra una lista di card con titolo, descrizione, icona e link alla pagina di dettaglio.
-->
<script setup>
// Meta tag SEO per la pagina servizi
useSeoMeta({
	title: 'Servizi di Spedizione | SpediamoFacile',
	ogTitle: 'Servizi di Spedizione | SpediamoFacile',
	description: 'Scopri tutti i servizi di spedizione SpediamoFacile: pagamento alla consegna, documenti con prova di consegna, corriere nazionale ed internazionale.',
	ogDescription: 'Tutti i servizi di spedizione SpediamoFacile: contrassegno, prova di consegna, corriere nazionale.',
});

// Fallback hardcoded
const fallbackServices = [
	{ title: "Pagamento alla consegna", description: "Il pagamento alla consegna è utile quando vuoi far pagare il destinatario al momento del ritiro del pacco. Il corriere incassa per tuo conto e poi riversa l'importo al mittente secondo le tempistiche previste dal servizio. È una soluzione comoda per vendite occasionali o quando il cliente finale preferisce pagare solo alla consegna.", icon: "mdi:cash-register", slug: "pagamento-alla-consegna" },
	{ title: "Spedizione senza etichetta", description: "Non hai una stampante? Nessun problema. Con il servizio senza etichetta prepari il pacco e la gestione dell'etichetta viene affidata al corriere o al punto di raccolta. Ti basta un codice QR sul telefono per spedire comodamente.", icon: "mdi:qrcode", slug: "spedizione-senza-etichetta" },
	{ title: "Ritiro a domicilio", description: "Il corriere viene direttamente al tuo indirizzo per prelevare il pacco. Non devi portare nulla in posta o al punto di raccolta: prepari il pacco, prenoti il ritiro e aspetti comodamente. Il servizio è incluso nel prezzo della maggior parte delle spedizioni.", icon: "mdi:home-clock-outline", slug: "ritiro-a-domicilio" },
	{ title: "Assicurazione sulla spedizione", description: "Proteggi i tuoi pacchi con l'assicurazione SpediamoFacile. Per un costo minimo rispetto al valore della merce, ottieni copertura per danni, smarrimento e furto durante il trasporto. Dichiara il valore e spedisci con tranquillità.", icon: "mdi:shield-check-outline", slug: "assicurazione-spedizione" },
	{ title: "Sponda idraulica", description: "Per colli pesanti o voluminosi che non possono essere caricati manualmente. Una piattaforma mobile montata sul veicolo solleva il pacco dal livello strada al pianale del mezzo. Indispensabile per elettrodomestici, macchinari e pallet.", icon: "mdi:forklift", slug: "sponda-idraulica" },
	{ title: "Spedizione programmata", description: "Pianifica le tue spedizioni in anticipo scegliendo la data di ritiro che preferisci. Ideale per aziende con flussi regolari e per chi vuole organizzare il lavoro senza sorprese. Programma il ritiro fino a 30 giorni prima.", icon: "mdi:calendar-clock-outline", slug: "spedizione-programmata" },
	{ title: "Chiamata pre-consegna", description: "Il corriere contatta telefonicamente il destinatario prima di effettuare la consegna. Riduce i tentativi a vuoto e migliora l'esperienza del destinatario, garantendo la presenza al momento della consegna.", icon: "mdi:phone-ring-outline", slug: "chiamata-pre-consegna" },
	{ title: "Assistenza rapida", description: "Supporto prioritario con tempi di risposta ridotti. Un team dedicato gestisce reclami, giacenze e variazioni con la massima rapidità. Ideale per aziende e professionisti che non possono permettersi ritardi.", icon: "mdi:headset", slug: "assistenza-rapida" },
	{ title: "Punti fedeltà", description: "Ogni spedizione ti fa guadagnare punti che puoi convertire in sconti sulle spedizioni successive. Più spedisci, più risparmi. Il programma è gratuito e si attiva automaticamente con la registrazione.", icon: "mdi:star-circle-outline", slug: "punti-fedelta" },
];

// Icone SVG inline per i servizi (usate al posto di <Icon>)
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

const sanctum = useSanctumClient();
const services = ref(fallbackServices);
const loading = ref(true);

onMounted(async () => {
	try {
		const res = await sanctum('/api/public/services');
		const data = res?.data || res;
		if (Array.isArray(data) && data.length > 0) {
			services.value = data;
		}
	} catch (e) {
		// API non disponibile, usa fallback
	}
	loading.value = false;
});

// Restituisce il link alla pagina di dettaglio
const getServiceLink = (service) => {
	return `/servizi/${service.slug}`;
};

// SVG path per icona servizio
const getServiceSvg = (service) => {
	const iconKey = service.icon || '';
	return serviceIcons[iconKey] || serviceIcons['mdi:headset'];
};
</script>

<template>
	<!-- Sezione servizi: mostra ogni servizio con icona, titolo, descrizione e bottone "Leggi" -->
	<section id="servizi">
		<div class="my-container">
			<!-- Loading -->
			<div v-if="loading" class="flex justify-center py-[60px]">
				<div class="w-[40px] h-[40px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
			</div>

			<!-- Card servizio: layout alternato (immagine sx/dx) per ogni servizio -->
			<template v-else>
				<div
					class="flex items-center flex-wrap justify-center mid-desktop:justify-between desktop:first:mt-[93px] first:mt-[59px] last:mb-[27px] desktop:last:mb-[159px] mt-[88px] group mid-desktop:before:w-[45%] desktop:before:w-[446px] desktop-xl:before:w-[519px] desktop-xl:before:h-[483px] before:bg-[image:var(--service-image)] before:bg-cover before:w-[335px] before:h-[320px] before:mb-[72px] desktop:before:mb-0 even:mid-desktop:before:order-2 odd:desktop:before:h-[821px] even:desktop:before:h-[415px] before:content-[''] before:block odd:desktop-xl:before:h-[483px] even:desktop-xl:before:h-[483px] desktop-xl:justify-start even:desktop-xl:justify-end desktop-xl:gap-x-[96px] before:rounded-[20px] desktop:before:rounded-[38px] desktop-xl:mt-[121px]"
					v-for="(service, serviceIndex) in services"
					:key="serviceIndex"
					:style="{ '--service-image': service.featured_image ? `url(${service.featured_image})` : `url(${service.image || ''})` }">

					<div
						class="mid-desktop:max-w-[42%] desktop-xl:max-w-[596px] mid-desktop:before:w-[45%] group-even:mid-desktop:order-1 group-odd:desktop:min-h-[821px] group-odd:desktop-xl:min-h-auto group-odd:desktop:flex group-odd:desktop:flex-col group-odd:desktop:justify-between group-odd:desktop-xl:block">
						<!-- Icona servizio (inline SVG) -->
						<div class="w-[48px] h-[48px] rounded-[12px] bg-[#e8f4fb] flex items-center justify-center mb-[16px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[24px] h-[24px] text-[#095866]" fill="currentColor" v-html="getServiceSvg(service)"></svg>
						</div>
						<h2 class="text-[1.875rem] desktop:text-[3rem] font-medium tracking-[-1.152px] text-[#222222] leading-[110%] desktop:max-w-[385px] desktop-xl:max-w-full">
							{{ service.title }}
						</h2>

						<p class="text-[0.875rem] desktop:text-[1.125rem] text-[#737373] leading-[160%] tracking-[-0.252px] mt-[20px] mb-[40px]">
							{{ service.description || service.meta_description || service.intro }}
						</p>

						<!-- Bottone con freccia inline SVG -->
						<NuxtLink :to="getServiceLink(service)" class="inline-flex items-center gap-[8px] px-[20px] h-[44px] rounded-[35px] bg-[#E44203] text-center text-white font-semibold tracking-[-0.336px] text-[0.875rem] transition-[background-color,box-shadow] duration-200 hover:bg-[#c93800] hover:shadow-[0_4px_12px_rgba(228,66,3,0.3)]">
							Leggi di piu'
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/></svg>
						</NuxtLink>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
