<!--
	COMPONENTE SERVIZI HOMEPAGE (Homepage/Servizi.vue)

	Questo componente mostra la sezione "Spedisci senza pensieri" nella homepage.
	Presenta i 5 servizi principali offerti dal sito:

	1. Assistenza rapida - ticket, chat o telefono con risposta in 30 minuti
	2. Spedizione senza etichetta - il corriere porta l'etichetta gia' pronta
	3. Ritiro a domicilio - prenota oggi, ritiro domani
	4. Pagamento in contrassegno - il destinatario paga al corriere
	5. Wallet e Punti Fedelta' - ricarica il portafoglio e accumula punti

	Ogni servizio ha un'icona, un titolo, una descrizione e un pulsante
	che porta alla pagina dettagliata del servizio.

	Sotto i servizi c'e' anche una sezione di testo che spiega come funziona
	il sistema di calcolo prezzi e il tracciamento delle spedizioni.
-->
<script setup>
onMounted(() => {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				entry.target.classList.add('revealed');
				observer.unobserve(entry.target);
			}
		});
	}, { threshold: 0.15 });
	document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});

const items = ref([
	{
		label: "Team",
		content: "Non serve stampante, il corriere porta il foglio",
		/* ui: {
			header: "bg-primary-500", // Adds a hover effect to the header
			trigger: "p-4", // Adds padding to the button trigger area
			content: "text-base font-semibold", // Styles the content text
		}, */
	},
	{ label: "Assistenza", content: "Testo2" },
	{ label: "Brt", content: "Testo3" },
	{ label: "Qualità", content: "Testo4" },
	{ label: "Rapidità", content: "Testo5" },
]);

const services = ref([
	{
		title: "Assistenza rapida",
		icon: "/img/homepage/services/quick-assistance.svg",
		width: 98,
		height: 94,
		description: "Ticket, chat o telefono dal lunedì al venerdì: primo feedback medio in 30 minuti. Ti seguiamo dal preventivo alla consegna, incluse pratiche di rimborso o giacenza.",
		button: "Chiedi",
		url: "/contatti",
	},
	{
		title: "Spedizione senza etichetta",
		icon: "/img/homepage/services/label-free-shipping.svg",
		width: 104,
		height: 100,
		description: "Il driver BRT arriva con l'etichetta digitale già pronta: tu non stampi nulla, risparmi carta e riduci l'impronta di CO₂. Basta indicare peso, misure e indirizzi: al resto pensiamo noi.",
		button: "Leggi di più",
		url: "/servizi",
	},
	{
		title: "Ritiro a domicilio",
		icon: "/img/homepage/services/home-pickup.svg",
		width: 94,
		height: 83,
		description: "Prenota oggi, ritiro domani dove vuoi tu: abitazione, ufficio o negozio. Notifiche live e secondo tentativo gratuito se il destinatario è assente.",
		button: "Leggi di più",
		url: "/servizi",
	},
	{
		title: "Pagamento in contrassegno",
		icon: "/img/homepage/services/cash-on-delivery.svg",
		width: 94,
		height: 94,
		description: "Il destinatario salda al corriere in contanti o POS; tu ricevi l'importo sul Wallet o su IBAN entro 5 giorni. Massimo gestibile 999 €. Azzera il rischio di insoluti.",
		button: "Leggi di più",
		url: "/servizi/pagamento-alla-consegna",
	},
	{
		title: "Wallet e Punti Fedeltà",
		icon: "/img/homepage/services/loyalty-points.svg",
		width: 82,
		height: 106,
		description: "Ricarica con tagli da 25/50/100 € e ottieni subito un bonus del 10 %. I punti si sommano ad ogni spedizione e li spendi al checkout per abbassare il prezzo.",
		button: "Leggi di più",
		url: "/account/portafoglio",
	},
]);

const firstService = services.value[0];

const otherServices = computed(() => services.value.slice(1));

/* const preventTextSelection = (event) => {
	event.preventDefault();
}; */
</script>

<template>
	<!-- content-visibility: auto — sezione below-the-fold, rendering differito -->
	<section class="mt-[80px] tablet:mt-[120px] desktop:mt-[164px] desktop-xl:pb-[231px] pb-[60px] tablet:pb-[94px] desktop:pb-[172px] cv-auto">
		<div class="my-container">
			<div class="font-montserrat">
				<h2 class="font-bold text-[0.875rem] tracking-[0.2px] text-[#095866] text-center reveal">Servizi</h2>

				<p class="font-bold text-[1.5rem] tracking-[0.1px] text-[#252B42] text-center my-[10px] reveal">Spedisci senza pensieri</p>

				<p class="text-[0.875rem] tracking-[0.2px] text-[#737373] text-center max-w-[756px] mx-auto leading-[20px] reveal">
					Scegli il servizio che ti serve, ottieni il prezzo in tempo reale e affida il pacco a BRT in meno di due minuti. Niente file, niente carta, solo soluzioni fatte per te.
				</p>

				<div class="desktop-xl:flex desktop-xl:items-start desktop-xl:justify-between mt-[50px]">
					<div class="tablet:w-[448px] tablet:mx-auto desktop-xl:mx-0">
						<!-- contain: content — isola layout/paint per ogni card indipendente -->
						<div class="bg-white rounded-[20px] tablet:rounded-[30px] p-[16px] tablet:p-[24px] desktop-xl:w-[364px] shadow-[0_13px_19px_rgba(0,0,0,0.07)] mx-auto card-hover reveal contain-content">
							<!-- Ottimizzazione: decoding async per non bloccare il rendering -->
						<NuxtImg :src="services[0].icon" :alt="services[0].title" :width="services[0].width" :height="services[0].height" loading="lazy" decoding="async" class="mx-auto max-w-[72px] tablet:max-w-[90px] desktop:max-w-none" />
							<h3 class="services-title">{{ services[0].title }}</h3>

							<p class="services-description">
								{{ services[0].description }}
							</p>

							<!-- Miglioramento UX: aggiunto btn-hover per feedback visivo al passaggio del mouse -->
						<NuxtLink :to="services[0].url" class="services-button w-[107px] flex items-center justify-center gap-x-[10px] btn-hover">
								{{ services[0].button }}

								<NuxtImg src="/img/homepage/services/arrow-right.svg" aria-hidden="true" width="9" height="16" alt="" loading="lazy" decoding="async" class="w-[9px] h-[16px]" />
							</NuxtLink>
						</div>
					</div>

					<div class="tablet:flex tablet:items-start tablet:justify-between desktop-xl:justify-center tablet:flex-wrap mt-[60px] desktop-xl:mt-0 tablet:w-full">
						<!-- contain: content — isola layout/paint per ogni card indipendente -->
					<div v-for="(service, index) in otherServices" :key="index" class="tablet:w-[370px] min-h-[300px] tablet:min-h-[363px] p-[20px_16px_0_16px] tablet:p-[35px_27px_0_27px] desktop-xl:mb-[24px] mb-[40px] tablet:mb-[60px] tablet:mx-auto desktop-xl:mx-0 rounded-[20px] card-hover reveal contain-content" :style="{ transitionDelay: `${(index + 1) * 80}ms` }">
							<!-- Ottimizzazione: decoding async per non bloccare il rendering -->
							<NuxtImg :src="service.icon" :alt="service.title" :width="service.width" :height="service.height" loading="lazy" decoding="async" class="mx-auto max-w-[64px] tablet:max-w-[80px] desktop:max-w-none" />

							<h3 class="services-title">{{ service.title }}</h3>

							<p class="services-description">
								{{ service.description }}
							</p>

							<!-- Miglioramento UX: aggiunto btn-hover per feedback visivo -->
							<NuxtLink :to="service.url" class="services-button w-[153px] flex items-center justify-center gap-x-[10px] btn-hover">
								{{ service.button }}
								<!-- <Icon name="fe:arrow-right" class="text-[22px] align-middle" /> -->
								<NuxtImg src="/img/homepage/services/arrow-right.svg" aria-hidden="true" width="9" height="16" alt="" loading="lazy" decoding="async" class="w-[9px] h-[16px]" />
							</NuxtLink>
						</div>
					</div>
				</div>
			</div>

			<div class="flex items-start flex-wrap desktop:justify-between mt-[80px] tablet:mt-[120px] desktop:mt-[156px]">
				<div class="desktop-xl:max-w-[563px] desktop-xl:mt-[124px] mt-[30px] tablet:mt-[50px] order-2 desktop:order-1 w-full tablet:w-auto desktop:w-[44%] desktop-xl:w-auto reveal">
					<p class="desktop-xl:text-[1.5rem] tablet:text-[1rem] text-[0.875rem] font-semibold leading-[160%] text-black tracking-[-0.336px]">
						Con pochi dati ottieni il prezzo in tempo reale, prenoti il corriere e ricevi l'etichetta via e-mail, tutto in meno di due minuti.
					</p>

					<p
						class="desktop-xl:text-[1.5rem] text-[0.875rem] font-medium leading-[160%] text-[#404040] desktop-xl:mt-[40px] tracking-[-0.336px] mt-[20px] desktop:mb-[48px] mb-[20px] tablet:text-[1rem]">
						Che tu debba inviare un singolo pacco o spedisca regolarmente per il tuo negozio online, Spediamofacile ti affianca passo dopo passo. Inserisci peso, dimensioni e indirizzi: il nostro
						sistema calcola automaticamente la tariffa più conveniente fra peso reale e peso-volume, applica eventuali supplementi di zona e ti mostra subito il totale. Se non hai la stampante, scegli
						l'opzione 'Senza Etichetta': il corriere porterà il documento già pronto al momento del ritiro. In più, grazie al tracciamento in tempo reale e al servizio clienti interno, sai sempre
						dov'è il tuo pacco, dal ritiro fino alla consegna.
					</p>

					<NuxtLink
						to="/servizi"
						class="bg-[#E44203] text-white desktop-xl:w-[170px] desktop-xl:h-[60px] desktop-xl:block tablet:text-[1.25rem] tracking-[-0.48px] font-semibold text-center rounded-[35px] leading-[59px] p-[10px_20px] desktop-xl:p-0 btn-hover inline-block">
						Scopri di più
					</NuxtLink>
				</div>

				<div class="order-1 desktop:order-2 desktop:w-[48%] desktop-xl:w-auto reveal">
					<h3 class="text-[#222222] desktop-xl:text-[4rem] text-[1.5rem] tablet:text-[1.875rem] font-medium leading-[120%] tablet:leading-[110%] max-w-[671px] tracking-[-0.5px] tablet:tracking-[-1.536px] desktop:text-[3rem]">
						Spedire diventa facile, veloce e sicuro
					</h3>

					<!-- <NuxtImg src="/img/trasporti-2-img.png" alt="" width="539" height="499" class="mt-[82px] ml-auto" /> -->
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
	.reveal {
		opacity: 0;
		transform: translateY(20px);
		transition: opacity 0.5s ease, transform 0.5s ease;
	}
	.reveal.revealed {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
