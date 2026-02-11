<script setup>
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
		icon: "/img/homepage/services/quick-assistance.png",
		width: 98,
		height: 94,
		description: "Ticket, chat o telefono dal lunedì al venerdì: primo feedback medio in 30 minuti. Ti seguiamo dal preventivo alla consegna, incluse pratiche di rimborso o giacenza.",
		button: "Chiedi",
		url: "/",
	},
	{
		title: "Spedizione senza etichetta",
		icon: "/img/homepage/services/label-free-shipping.png",
		width: 104,
		height: 100,
		description: "Il driver BRT arriva con l'etichetta digitale già pronta: tu non stampi nulla, risparmi ta e riduci l'impronta di CO₂. Basta indie peso, misure e indirizzi: al resto pensiamo noi.",
		button: "Leggi di più",
		url: "/",
	},
	{
		title: "Ritiro a domicilio",
		icon: "/img/homepage/services/home-pickup.png",
		width: 94,
		height: 83,
		description: "Prenota oggi, ritiro domani dove vuoi tu: abitazione, ufficio o negozio. Notifiche live e secondo tentativo gratuito se il destinatario è assente.",
		button: "Leggi di più",
		url: "/",
	},
	{
		title: "Pagamento in contrassegno",
		icon: "/img/homepage/services/cash-on-delivery.png",
		width: 94,
		height: 94,
		description: "Il destinatario salda al corriere in contanti o POS; tu ricevi l'importo sul Wallet o su IBAN entro 5 giorni. Massimo gestibile 999 €. Azzera il rischio di insoluti.",
		button: "Leggi di più",
		url: "/",
	},
	{
		title: "Wallet e Punti Fedeltà",
		icon: "/img/homepage/services/loyalty-points.png",
		width: 82,
		height: 106,
		description: "Riica con tagli da 25/50/100 € e ottieni subito un bonus del 10 %. I punti si sommano ad ogni spedizione e li spendi al checkout per abbassare il prezzo.",
		button: "Leggi di più",
		url: "/",
	},
]);

const firstService = services.value[0];

const otherServices = computed(() => services.value.slice(1));

/* const preventTextSelection = (event) => {
	event.preventDefault();
}; */
</script>

<template>
	<section class="mt-[164px] desktop-xl:pb-[231px] pb-[94px] desktop:pb-[172px]">
		<div class="my-container">
			<div class="font-montserrat">
				<h2 class="font-bold text-[0.875rem] tracking-[0.2px] text-[#23A6F0] text-center">Servizi</h2>

				<p class="font-bold text-[1.5rem] tracking-[0.1px] text-[#252B42] text-center my-[10px]">Spedisci senza pensieri</p>

				<p class="text-[0.875rem] tracking-[0.2px] text-[#737373] text-center max-w-[756px] mx-auto leading-[20px]">
					Scegli il servizio che ti serve, ottieni il prezzo in tempo reale e affida il pacco a BRT in meno di due minuti. Niente file, niente ta, solo soluzioni fatte per te.
				</p>

				<div class="desktop-xl:flex desktop-xl:items-start desktop-xl:justify-between mt-[50px]">
					<div class="tablet:w-[448px] tablet:mx-auto desktop-xl:mx-0">
						<div class="bg-white rounded-[30px] p-[24px] desktop-xl:w-[364px] shadow-[0_13px_19px_rgba(0,0,0,0.07)] mx-auto">
							<NuxtImg :src="services[0].icon" :alt="services[0].title" :width="services[0].width" :height="services[0].height" class="mx-auto" />
							<h3 class="services-title">{{ services[0].title }}</h3>

							<p class="services-description">
								{{ services[0].description }}
							</p>

							<NuxtLink :to="services[0].url" class="services-button w-[107px] flex items-center justify-center gap-x-[10px]">
								{{ services[0].button }}

								<NuxtImg src="/img/homepage/services/arrow-right.svg" aria-hidden="true" width="9" height="16" alt="" class="w-[9px] h-[16px]" />
							</NuxtLink>
						</div>
					</div>

					<div class="tablet:flex tablet:items-start tablet:justify-between desktop-xl:justify-center tablet:flex-wrap mt-[60px] desktop-xl:mt-0 tablet:w-full">
						<div v-for="(service, index) in otherServices" :key="index" class="tablet:w-[370px] min-h-[363px] p-[35px_27px_0_27px] desktop-xl:mb-[24px] mb-[60px] tablet:mx-auto desktop-xl:mx-0">
							<NuxtImg :src="service.icon" :alt="service.title" :width="service.width" :height="service.height" class="mx-auto" />

							<h3 class="services-title">{{ service.title }}</h3>

							<p class="services-description">
								{{ service.description }}
							</p>

							<NuxtLink :to="service.url" class="services-button w-[153px] flex items-center justify-center gap-x-[10px]">
								{{ service.button }}
								<!-- <Icon name="fe:arrow-right" class="text-[22px] align-middle" /> -->
								<NuxtImg src="/img/homepage/services/arrow-right.svg" aria-hidden="true" width="9" height="16" alt="" class="w-[9px] h-[16px]" />
							</NuxtLink>
						</div>
					</div>
				</div>
			</div>

			<div class="flex items-start flex-wrap desktop:justify-between mt-[156px]">
				<div class="desktop-xl:max-w-[563px] desktop-xl:mt-[124px] mt-[50px] order-2 desktop:order-1 w-[80%] tablet:w-auto desktop:w-[44%] desktop-xl:w-auto">
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
						to="/"
						class="bg-[#E44203] text-white desktop-xl:w-[170px] desktop-xl:h-[60px] desktop-xl:block tablet:text-[1.25rem] tracking-[-0.48px] font-semibold text-center rounded-[35px] leading-[59px] p-[10px_20px] desktop-xl:p-0">
						Scopri di più
					</NuxtLink>
				</div>

				<div class="order-1 desktop:order-2 desktop:w-[48%] desktop-xl:w-auto">
					<h3 class="text-[#222222] desktop-xl:text-[4rem] text-[1.875rem] font-medium leading-[110%] max-w-[671px] tracking-[-1.536px] desktop:text-[3rem]">
						Spedire diventa facile, veloce e sicuro
					</h3>

					<!-- <NuxtImg src="/img/trasporti-2-img.png" alt="" width="539" height="499" class="mt-[82px] ml-auto" /> -->
				</div>
			</div>
		</div>
	</section>
</template>
