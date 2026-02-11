<script setup>
const userStore = useUserStore();

import { Swiper, SwiperSlide } from "swiper/vue";

import "swiper/css";
import "swiper/css/navigation";

// import required modules
import { Navigation } from "swiper/modules";

definePageMeta({
	middleware: ["shipment-validation"],
});

/* Servizi */
const services = ref({
	service_type: "",
	date: "",
	time: "",
});

const servicesList = ref([
	{
		img: "no-label.png",
		width: 78,
		height: 51,
		name: "Spedizione Senza etichetta",
		description: "Non stampare nulla: mostrare un codice sul telefono, etichetta applicata al ritiro.",
		isSelected: false,
	},
	{
		img: "cash-on-delivery.png",
		width: 60,
		height: 51,
		name: "Contrassegno",
		description: "Pagare alla consegna: il corriere incassare dal destinatario per conto del mittente.",
		isSelected: false,
		popupDescription:
			"Fare pagare il destinatario al momento della consegna. Il corriere incassa l'importo e lo accredita al mittente secondo la modalità scelta. Se il destinatario non paga o rifiuta, la consegna non viene completata.",
	},
	{
		img: "insurance.png",
		width: 64,
		height: 64,
		name: "Assicurazione",
		description: "Coprire il valore: rimborso in caso di smarrimento, furto o danneggiamento.",
		isSelected: false,
		popupIcon: "insurance-icon.png",
		popupDescription: "Indicare il valore del contenuto. In caso di smarrimento o danneggiamento durante il trasporto, è possibile richiedere un rimborso secondo le condizioni del servizio.",
	},
	{
		img: "pickup-and-delivery.png",
		width: 60,
		height: 60,
		name: "Ritiro e consegna",
		description: "Ritiro a domicilio e consegna allindirizzo indicato.",
		isSelected: false,
	},
	{
		img: "tail-lift.png",
		width: 58,
		height: 55,
		name: "Sponda idraulica",
		description: "Camion con pedana di sollevamento per carico e scarico di colli pesanti.",
		isSelected: false,
		popupDescription:
			"Richiedere il mezzo con sponda per caricare o scaricare quando non è disponibile banchina, muletto o personale di movimentazione. La disponibilità dipende dal corriere e dalla tratta.",
	},
	{
		img: "scheduled.png",
		width: 52,
		height: 51,
		name: "Programmato",
		description: "Scegliere in anticipo il giorno (e, se disponibile, la fascia) di ritiro o consegna.",
		isSelected: false,
		popupDescription: "Se disponibile per questa spedizione, permettere di indicare i giorni in cui il destinatario è reperibile. La consegna verrà tentata solo nei giorni selezionati.",
	},
	{
		img: "call.png",
		width: 64,
		height: 61,
		name: "Chiamata",
		description: "Ricevere un avviso (messaggio o chiamata) quando il pacco è in consegna.",
		isSelected: false,
		popupDescription: "Inserire un numero di telefono per concordare la consegna. Il servizio può richiedere fino a 5 giorni lavorativi aggiuntivi.",
	},
	{
		img: "post-office-box.png",
		width: 50,
		height: 67,
		name: "Casella postale",
		description: "Recapito in ufficio postale, dentro una casella dedicata al destinatario.",
		isSelected: false,
	},
	{
		img: "prova.png",
		width: 74,
		height: 55,
		name: "Prova",
		description: "Prova",
		isSelected: false,
	},
]);

const open = ref(false);

const { session, status, refresh } = useSession();

const route = useRoute();

const middleware = () => {
	if (!session.value?.data?.services && route.fullPath.endsWith("3")) {
		return navigateTo("/la-tua-spedizione/2");
	}
};

middleware();

const isServiceChecked = ref(false);

const selectedService = ref({
	index: "",
	name: "",
	description: "",
	icon: "",
});

const myService = ref(null);
const myServiceIndex = ref(null);

const chooseService = (service, serviceIndex) => {
	open.value = true;

	selectedService.value.name = service.name;
	selectedService.value.description = service.popupDescription;
	selectedService.value.index = serviceIndex;
	selectedService.value.icon = service.popupIcon;

	servicesList.value[serviceIndex].isSelected = true;
};

const addService = () => {
	if (!userStore.servicesArray.includes(myService.value.name)) {
		userStore.servicesArray.push(myService.value.name);
	} else {
		const index = userStore.servicesArray.indexOf(myService.value.name);
		if (index !== -1) {
			userStore.servicesArray.splice(index, 1); // rimuove 1 elemento all’indice trovato
		}
	}

	services.value.service_type = userStore.servicesArray.join(", ");
};

const chooseDate = (day) => {
	const lastDay = day.date.toLocaleDateString();
	if (!services.value.date || services.value.date != lastDay) {
		services.value.date = day.date.toLocaleDateString();
	} else {
		services.value.date = "";
	}
};

const daysInMonth = computed(() => {
	const arr = [];

	const today = new Date();
	const year = today.getFullYear();
	const month = today.getMonth();
	const day = today.getDate() + 1;

	// Giorni rimanenti del mese corrente
	const daysCurrentMonth = new Date(year, month + 1, 0).getDate();
	for (let i = day; i <= daysCurrentMonth; i++) {
		const date = new Date(year, month, i);

		const weekday = date.toLocaleString("default", { weekday: "short" });
		const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

		const monthAbbr = date.toLocaleString("default", { month: "short" });
		const formattedMonthAbbr = monthAbbr.charAt(0).toUpperCase() + monthAbbr.slice(1);

		if (formattedWeekday !== "Sab" && formattedWeekday !== "Dom") {
			arr.push({
				date,
				weekday: formattedWeekday,
				dayNumber: date.getDate(),
				monthAbbr: formattedMonthAbbr,
			});
		}
	}

	// Tutti i giorni del mese successivo
	const nextMonth = month + 1;
	const daysNextMonth = new Date(year, nextMonth + 1, 0).getDate();
	for (let i = 1; i <= daysNextMonth; i++) {
		const date = new Date(year, nextMonth, i);

		const weekday = date.toLocaleString("default", { weekday: "short" });
		const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

		const monthAbbr = date.toLocaleString("default", { month: "short" });
		const formattedMonthAbbr = monthAbbr.charAt(0).toUpperCase() + monthAbbr.slice(1);

		if (formattedWeekday !== "Sab" && formattedWeekday !== "Dom") {
			arr.push({
				date,
				weekday: formattedWeekday,
				dayNumber: date.getDate(),
				monthAbbr: formattedMonthAbbr,
			});
		}
	}

	return arr;
});

const isOriginDetailsEdited = ref(false);
const isDestinationDetailsEdited = ref(false);

const temporaryShipmentDetails = ref({});

const editOriginDetails = () => {
	temporaryShipmentDetails.value = { ...userStore.shipmentDetails };

	isOriginDetailsEdited.value = !isOriginDetailsEdited.value;
};

const editDestinationDetails = () => {
	temporaryShipmentDetails.value = { ...userStore.shipmentDetails };

	isDestinationDetailsEdited.value = !isDestinationDetailsEdited.value;
};

const myClose = () => {
	open.value = false;
	servicesList.value[selectedService.value.index].isSelected = false;
};

/* Dati indirizzo generico */
const address = {
	full_name: "",
	additional_information: "",
	address: "",
	address_number: "",
	intercom_code: "",
	country: "Italia",
	province: "",
	telephone_number: "",
	email: "",
};

/* Dati indirizzo di partenza */
const originAddress = ref({
	...address,
	type: "Partenza",
	city: session.value?.data?.shipment_details.origin_city,
	postal_code: session.value?.data?.shipment_details.origin_postal_code,
});

/* Dati indirizzo di destinazione */
const destinationAddress = ref({
	...address,
	type: "Destinazione",
	city: session.value?.data?.shipment_details.destination_city,
	postal_code: session.value?.data?.shipment_details.destination_postal_code,
});

const days = ["Lun", "Mar", "Mer", "Gio", "Ven"];
</script>

<template>
	<section>
		<div class="my-container mt-[72px] mb-[283px]">
			<form ref="formRef" @submit.prevent="">
				<Steps />

				<UModal
					:dismissible="false"
					v-model:open="open"
					:title="selectedService?.name"
					:description="selectedService?.description"
					aria-describedby="undefined"
					:close="false"
					:class="{
						'max-w-[900px]': selectedService?.index === 1,
						'max-w-[690px]': selectedService?.index === 2,
						'max-w-[860px]': selectedService?.index === 5,
						'max-w-[645px]': selectedService?.index === 6 || selectedService?.index === 4,
					}">
					<template #title>
						<div class="flex justify-between">
							<h3 class="text-[#252B42] font-bold text-[1.8125rem] tracking-[0.1px]">
								{{ selectedService?.name }}
							</h3>

							<UButton label="" class="active:bg-transparent bg-transparent cursor-pointer hover:bg-transparent w-[47px] h-[37px] bg-[url(/img/quote/second-step/close.png)]" @click="myClose" />
						</div>
					</template>

					<!-- <template #description>
						<p class="text-[#252B42] mt-[20px] text-[0.9375rem] leading-[24px] tracking-[0.1px] text-center">{{ myService?.popupDescription }}</p>
					</template> -->

					<!-- <template #title>
						<span class="sr-only">{{ myService?.name }}</span>
					</template>

					<template #description>
						<span class="sr-only">{{ myService?.popupDescription }}</span>
					</template> -->
					<!-- <template #header>
						<div class="flex items-start justify-between">
							<h3 class="text-[#252B42] font-bold text-[1.8125rem] tracking-[0.1px] bg-[url(/img/quote/second-step/insurance-icon.png)] bg-left bg-no-repeat pl-[60px]">
								{{ myService?.name }}
							</h3>

							<UButton label="" class="active:bg-transparent bg-transparent cursor-pointer hover:bg-transparent w-[47px] h-[37px] bg-[url(/img/quote/second-step/close.png)]" @click="myClose" />
						</div>

						<p class="text-[#252B42] mt-[21px] text-[0.9375rem] leading-[24px] tracking-[0.1px] text-center w-full">
							{{ myService?.popupDescription }}
						</p>
					</template> -->
					<template #body>
						<!-- <UButton
							label=""
							class="active:bg-transparent bg-transparent cursor-pointer hover:bg-transparent w-[47px] h-[37px] bg-[url(/img/quote/second-step/close.png)] absolute right-[30px] top-[40px]"
							@click="myClose" /> -->

						<!-- Assicurazione -->
						<div v-if="selectedService?.index === 2">
							<ul>
								<li v-for="(pack, indexPopup) in session?.data?.packages" :key="indexPopup" class="mt-[20px] first:mt-0">
									<label for="pack_value" class="label-popup">
										Valore collo #{{ indexPopup + 1 }} - {{ pack.weight }} Kg - ({{ pack.first_size }} x {{ pack.second_size }} x {{ pack.third_size }} ) cm
									</label>
									<input type="text" name="" id="pack_value" class="input-popup" placeholder="0.00" />
								</li>
							</ul>
						</div>

						<div v-if="selectedService?.index === 4" class="">
							<label for="pallet" class="label-popup">Pallet</label>
							<input type="text" name="" id="pallet" class="input-popup" />
						</div>

						<div v-if="selectedService?.index === 5" class="flex items-start justify-between pb-[20px]">
							<div v-for="(day, dayIndex) in days" :key="dayIndex" class="w-[94px]">
								<label for="day" class="block text-black text-[1.25rem] tracking-[-0.48px] font-medium text-center">{{ day }}</label>
								<select name="" id="day" class="border-[0.2px] border-[#ABABAB] rounded-[30px] h-[36px] leading-[36px] pl-[18px] w-full mt-[10px] text-[0.875rem] font-medium text-[#767676]">
									<option value="">No</option>
									<option value="">Si</option>
								</select>
							</div>
						</div>

						<div v-if="selectedService?.index === 6" class="">
							<label for="telephone_number" class="label-popup">Telefono</label>
							<input type="tel" name="" id="telephone_number" class="input-popup" />
						</div>
					</template>

					<template #footer>
						<div class="mx-auto mt-[27px]">
							<UButton
								label="Annulla"
								class="active:bg-[#996D47] bg-[#996D47] text-white cursor-pointer font-normal text-[1.125rem] rounded-[15px] hover:bg-[#996D47] h-[39px] leading-[39px] px-[25px] justify-center"
								@click="myClose" />

							<button class="bg-[#203A72] text-white px-[25px] cursor-pointer ml-[125px] font-normal text-[1.125rem] rounded-[15px] h-[39px] leading-[39px]" @click="addService(myService)">
								Aggiungi
							</button>
						</div>
					</template>
				</UModal>

				<ClientOnly>
					<div class="bg-[#E6E6E6] rounded-[20px] pt-[13px]">
						<h2 class="ml-[78px] text-[1.8125rem] text-[#252B42] font-bold font-montserrat tracking-[0.1px]">Imposta giorno di ritiro</h2>

						<div class="py-[38px]">
							<div class="relative px-[35px]">
								<Swiper
									class="my-swiper h-[108px]"
									:modules="[Navigation]"
									:slides-per-view="7"
									space-between="30"
									:navigation="{
										nextEl: '.custom-next',
										prevEl: '.custom-prev',
									}">
									<SwiperSlide v-for="(day, index) in daysInMonth" :key="index">
										<label
											:key="day.date.toISOString()"
											class="size-full block rounded-[10px] cursor-pointer select-none border-[1px] border-t-0"
											:class="{
												'border-[#2B2D52]': services.date == day.date.toLocaleDateString(),
												'border-[#C0C0C0]': services.date != day.date.toLocaleDateString(),
											}">
											<span
												class="w-full text-center block font-medium h-[35px] leading-[35px] rounded-[10px_10px_0_0] border-t-0"
												:class="{
													'bg-[#2B2D52] text-white': services.date == day.date.toLocaleDateString(),
													'bg-[#C0C0C0] text-black': services.date != day.date.toLocaleDateString(),
												}">
												{{ day.weekday }}
											</span>
											<div class="flex flex-col justify-center items-center text-[#767676] leading-[30px] mt-[10px]">
												<span class="font-bold text-[2.5rem]">{{ day.dayNumber }}</span>

												<span class="">{{ day.monthAbbr }}</span>
											</div>

											<input
												type="checkbox"
												v-if="day.weekday !== 'Sab' && day.weekday !== 'Dom'"
												@input="chooseDate(day)"
												class="opacity-0 pointer-events-none absolute bottom-0"
												:id="`date-${day.dayNumber}-${day.monthAbbr}`"
												:checked="services.date == day.date.toLocaleDateString()"
												:required="!services.date" />
										</label>
									</SwiperSlide>
								</Swiper>

								<button class="custom-prev absolute bottom-[35px] left-[10px] cursor-pointer"><NuxtImg src="/img/quote/second-step/arrow-left.png" alt="" width="11" height="19" /></button>
								<button class="custom-next absolute bottom-[35px] right-[10px] cursor-pointer"><NuxtImg src="/img/quote/second-step/arrow-right.png" alt="" width="11" height="19" /></button>
							</div>
						</div>
					</div>
				</ClientOnly>

				<div class="flex items-start font-montserrat mt-[99px]">
					<div class="desktop-xl:w-[893px]">
						<!-- #f0ffff  group hover:bg-[#727272]-->
						<div class="w-[850px]">
							<div class="flex items-start justify-between flex-wrap gap-[96px_50px]">
								<label
									v-for="(service, serviceIndex) in servicesList"
									:key="serviceIndex"
									class="flex flex-col items-center justify-center min-h-[250px] w-[calc(100%/3-34px)] text-center cursor-pointer rounded-[20px]"
									:class="{ 'bg-[rgba(89,89,89,.8)]': service.isSelected, 'bg-[#E6E6E6]': !service.isSelected }">
									<h3
										class="text-[1.125rem] font-bold text-[#252B42] service-list before:content-[''] before:block before:mx-auto before:mb-[20px] leading-[24px] tracking-[0.1px]"
										:class="{ 'text-[#F0F3FF] before:brightness-0 before:invert-100': service.isSelected }"
										:style="{ '--before-service-bg': `url(/img/quote/second-step/${service.img})`, '--before-service-width': `${service.width}px`, '--before-service-height': `${service.height}px` }">
										{{ service.name }}
									</h3>
									<p class="text-[#737373] mt-[20px] text-[0.875rem] leading-[20px] px-[20px] tracking-[0.2px]" :class="{ 'text-white': service.isSelected, 'text-[#737373]': !service.isSelected }">
										{{ service.description }}
									</p>
									<input
										type="checkbox"
										@click="chooseService(service, serviceIndex)"
										class="opacity-0 pointer-events-none absolute"
										:id="service.name"
										:checked="service.isSelected"
										:required="userStore.servicesArray.length === 0" />
								</label>
							</div>

							<div class="bg-[#E4E4E4] rounded-[20px] text-[#252B42] mt-[20px] pl-[40px] pt-[35px] pb-[43px]">
								<h2 class="font-bold text-[1.125rem] tracking-[0.1px] mb-[39px]">
									<!-- <Icon name="game-icons:position-marker" class="text-[#28a64c]" /> -->
									Partenza
								</h2>

								<div class="flex items-start gap-x-[30px]">
									<div class="desktop:w-[324px]">
										<label for="name" class="block text-[0.875rem] sr-only">Nome e Cognome*</label>
										<input type="text" placeholder="Nome e Cognome*" v-model="originAddress.full_name" id="name" class="input-preventivo-step-2" required />
									</div>

									<div class="desktop:w-[324px]">
										<label for="additional_information" class="block text-[0.875rem] sr-only">Informazioni aggiuntive</label>
										<input type="text" placeholder="Informazioni aggiuntive" v-model="originAddress.additional_information" id="additional_information" class="input-preventivo-step-2" />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[25px]">
									<div class="desktop:w-[285px]">
										<label for="address" class="block text-[0.875rem] sr-only">Indirizzo*</label>
										<input type="text" placeholder="Indirizzo*" v-model="originAddress.address" id="address" class="input-preventivo-step-2" required />
									</div>

									<div class="desktop:w-[213px]">
										<label for="address_number" class="block text-[0.875rem] sr-only">Numero civico*</label>
										<input type="text" placeholder="Numero civico*" v-model="originAddress.address_number" id="address_number" class="input-preventivo-step-2" required />
									</div>

									<div class="desktop:w-[213px]">
										<label for="intercom_code" class="block text-[0.875rem] sr-only">Citofono</label>
										<input type="text" placeholder="Citofono" v-model="originAddress.intercom_code" id="intercom_code" class="input-preventivo-step-2" />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[25px]">
									<div class="desktop:w-[174px]">
										<label for="country" class="block text-[0.875rem] sr-only">Paese*</label>
										<input type="text" placeholder="Paese*" id="country" class="input-preventivo-step-2" disabled />
									</div>

									<div class="desktop:w-[171px]">
										<label for="city" class="block text-[0.875rem] sr-only">Città*</label>
										<input type="text" placeholder="Città*" v-model="originAddress.city" id="city" class="input-preventivo-step-2" required />
									</div>

									<div class="desktop:w-[170px]">
										<label for="province" class="block text-[0.875rem] sr-only">Provincia*</label>
										<input type="text" placeholder="Provincia*" v-model="originAddress.province" id="province" class="input-preventivo-step-2" required />
									</div>

									<div class="desktop:w-[174px]">
										<label for="postal_code" class="block text-[0.875rem] sr-only">CAP*</label>
										<input type="text" placeholder="CAP*" v-model="originAddress.postal_code" id="postal_code" class="input-preventivo-step-2" required />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[30px]">
									<div class="desktop:w-[324px]">
										<label for="telephone_number" class="block text-[0.875rem] sr-only">Telefono*</label>
										<input type="tel" placeholder="Telefono*" v-model="originAddress.telephone_number" id="telephone_number" class="input-preventivo-step-2" required />
									</div>

									<div class="desktop:w-[324px]">
										<label for="email" class="block text-[0.875rem] sr-only">Email</label>
										<input type="email" placeholder="Email" v-model="originAddress.email" id="email" class="input-preventivo-step-2" />
									</div>
								</div>
							</div>

							<div class="bg-[#E4E4E4] rounded-[20px] text-[#252B42] mt-[20px] pl-[40px] pt-[35px] pb-[43px]">
								<h2 class="font-bold text-[1.125rem] tracking-[0.1px] mb-[39px]">
									<!-- <Icon name="game-icons:position-marker" class="text-[#28a64c]" /> -->
									Partenza
								</h2>

								<div class="flex items-start gap-x-[30px]">
									<div class="desktop:w-[324px]">
										<label for="name" class="block text-[0.875rem] sr-only">Nome e Cognome*</label>
										<input type="text" placeholder="Nome e Cognome*" v-model="destinationAddress.full_name" id="name" class="input-preventivo-step-2" required />
									</div>

									<div class="desktop:w-[324px]">
										<label for="additional_information" class="block text-[0.875rem] sr-only">Informazioni aggiuntive</label>
										<input type="text" placeholder="Informazioni aggiuntive" v-model="destinationAddress.additional_information" id="additional_information" class="input-preventivo-step-2" />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[25px]">
									<div class="desktop:w-[285px]">
										<label for="address" class="block text-[0.875rem] sr-only">Indirizzo*</label>
										<input type="text" placeholder="Indirizzo*" v-model="destinationAddress.address" id="address" class="input-preventivo-step-2" required />
									</div>

									<div class="desktop:w-[213px]">
										<label for="address_number" class="block text-[0.875rem] sr-only">Numero civico*</label>
										<input type="text" placeholder="Numero civico*" v-model="destinationAddress.address_number" id="address_number" class="input-preventivo-step-2" required />
									</div>

									<div class="desktop:w-[213px]">
										<label for="intercom_code" class="block text-[0.875rem] sr-only">Citofono</label>
										<input type="text" placeholder="Citofono" v-model="destinationAddress.intercom_code" id="intercom_code" class="input-preventivo-step-2" />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[25px]">
									<div class="desktop:w-[174px]">
										<label for="country" class="block text-[0.875rem] sr-only">Paese*</label>
										<input type="text" placeholder="Paese*" id="country" class="input-preventivo-step-2" disabled />
									</div>

									<div class="desktop:w-[171px]">
										<label for="city" class="block text-[0.875rem] sr-only">Città*</label>
										<input type="text" placeholder="Città*" v-model="destinationAddress.city" id="city" class="input-preventivo-step-2" required />
									</div>

									<div class="desktop:w-[170px]">
										<label for="province" class="block text-[0.875rem] sr-only">Provincia*</label>
										<input type="text" placeholder="Provincia*" v-model="destinationAddress.province" id="province" class="input-preventivo-step-2" required />
									</div>

									<div class="desktop:w-[174px]">
										<label for="postal_code" class="block text-[0.875rem] sr-only">CAP*</label>
										<input type="text" placeholder="CAP*" v-model="destinationAddress.postal_code" id="postal_code" class="input-preventivo-step-2" required />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[30px]">
									<div class="desktop:w-[324px]">
										<label for="telephone_number" class="block text-[0.875rem] sr-only">Telefono*</label>
										<input type="tel" placeholder="Telefono*" v-model="destinationAddress.telephone_number" id="telephone_number" class="input-preventivo-step-2" required />
									</div>

									<div class="desktop:w-[324px]">
										<label for="email" class="block text-[0.875rem] sr-only">Email</label>
										<input type="email" placeholder="Email" v-model="destinationAddress.email" id="email" class="input-preventivo-step-2" />
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- desktop-xl:w-[250px] before:content-[''] before:bg-green-500 before:w-[1px] before:block before:h-[871px] ml-[59px] -->
					<div class="border-l-[0.5px] border-rgba(0,0,0,.8) min-h-[871px] mt-[30px] pl-[59px] pt-[50px]">
						<div class="desktop-xl:w-[250px] flex flex-col gap-y-[50px]">
							<div class="bg-[#E4E4E4] rounded-[20px] p-[35px_21px] text-[#252B42] font-bold text-[0.6875rem] tracking-[0.1px]">
								<div>
									<div class="before:content-[''] before:inline-block before:bg-[url(/img/quote/second-step/origin.png)] before:w-[16px] before:h-[14px] before:mr-[10px] flex items-center">
										<div v-if="!isOriginDetailsEdited">{{ session?.data?.shipment_details.origin_city }} - {{ session?.data?.shipment_details.origin_postal_code }} - Italia</div>

										<div v-else>
											<input type="text" v-model="temporaryShipmentDetails.origin_city" id="" class="bg-white font-montserrat w-[45px]" />
											-
											<input type="text" v-model="temporaryShipmentDetails.origin_postal_code" id="" class="bg-white font-montserrat w-[45px]" />
											-
											<input type="text" value="Italia" id="" class="bg-white font-montserrat w-[45px]" />
										</div>

										<button type="button" @click="editOriginDetails" title="Modifica" class="ml-auto">
											<NuxtImg src="/img/quote/second-step/edit.png" alt="Modifica" width="13" height="13" />
										</button>
									</div>

									<div
										class="mt-[12px] before:content-[''] before:inline-block before:bg-[url(/img/quote/second-step/destination.png)] before:w-[16px] before:h-[14px] before:mr-[10px] flex items-center">
										<div v-if="!isDestinationDetailsEdited">{{ session?.data?.shipment_details.destination_city }} - {{ session?.data?.shipment_details.destination_postal_code }} - Italia</div>

										<div v-else>
											<input type="text" v-model="temporaryShipmentDetails.destination_city" id="" class="bg-white font-montserrat w-[45px]" />
											-
											<input type="text" v-model="temporaryShipmentDetails.destination_postal_code" id="" class="bg-white font-montserrat w-[45px]" />
											-
											<input type="text" value="Italia" id="" class="bg-white font-montserrat w-[45px]" />
										</div>

										<button type="button" @click="editDestinationDetails" title="Modifica" class="ml-auto">
											<NuxtImg src="/img/quote/second-step/edit.png" alt="Modifica" width="13" height="13" />
										</button>
									</div>
								</div>
							</div>

							<div class="bg-[#E4E4E4] rounded-[20px] p-[35px_21px] text-[#252B42] text-[0.6875rem] tracking-[0.1px]">
								<h4 class="text-center font-bold mb-[12px]">Colli</h4>

								<ul class="font-semibold">
									<li v-for="(pack, packIndex) in session?.data?.packages" :key="packIndex" class="mt-[10px] first:mt-0">
										<p>{{ pack.quantity }} x - {{ pack.weight }} kg</p>
										<p>({{ pack.first_size }} x {{ pack.second_size }} x {{ pack.third_size }}) cm</p>
									</li>
								</ul>
							</div>

							<div class="bg-[#E4E4E4] rounded-[20px] p-[35px_21px] text-[#252B42] text-[0.6875rem] tracking-[0.1px]">
								<h4 class="text-center font-bold mb-[12px]">Servizi</h4>

								<div>
									<ul class="font-semibold" v-if="userStore.servicesArray.length > 0">
										<li v-for="service in userStore.servicesArray" :key="service" class="mt-[5px] first:mt-0">
											{{ service }}
										</li>
									</ul>
									<p class="text-center" v-else>Non hai ancora scelto un servizio</p>
								</div>
							</div>

							<div class="bg-[#E4E4E4] rounded-[20px] p-[35px_21px] text-[#252B42] text-[0.6875rem] tracking-[0.1px] font-semibold">
								<h4 class="text-center font-bold mb-[12px]">Importo</h4>

								<p>IVA Inclusa</p>

								<p class="text-[2rem]">{{ session?.data?.total_price }}€</p>
							</div>
						</div>
					</div>
				</div>

				<NuxtLink :to="{ path: '/', hash: '#preventivo' }">Torna indietro</NuxtLink>
			</form>
		</div>

		<!-- <div v-else class="text-center min-h-[400px] flex items-center justify-center">Caricamento...</div> -->
	</section>
</template>

<style scoped>
.swiper-slide {
	background: #f1f1f1;
	border-radius: 10px;
}

.input-preventivo-step-2 {
	font-family: "Montserrat", sans-serif;
}

.title-popup::after {
	background-image: var(--before-bg);
	width: 26px;
	height: 28px;
}
</style>
