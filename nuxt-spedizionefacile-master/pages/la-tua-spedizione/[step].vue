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
	myService.value = service;
	myServiceIndex.value = serviceIndex;
};

const addService = (service = myService.value) => {
	if (!service?.name) {
		open.value = false;
		return;
	}

	if (!userStore.servicesArray.includes(service.name)) {
		userStore.servicesArray.push(service.name);
	} else {
		const index = userStore.servicesArray.indexOf(service.name);
		if (index !== -1) {
			userStore.servicesArray.splice(index, 1); // rimuove 1 elemento all’indice trovato
		}
	}

	services.value.service_type = userStore.servicesArray.join(", ");
	open.value = false;
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
	if (selectedService.value.index !== "" && servicesList.value[selectedService.value.index]) {
		servicesList.value[selectedService.value.index].isSelected = false;
	}
	open.value = false;
};

// Quando il modal viene chiuso dall'esterno (click fuori), deseleziona il servizio
watch(open, (newVal) => {
	if (!newVal && selectedService.value.index !== "" && servicesList.value[selectedService.value.index]) {
		servicesList.value[selectedService.value.index].isSelected = false;
	}
});

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

/* Validazione campi */
const validationErrors = ref({});
const showValidation = ref(false);

const validateField = (section, field, value, label) => {
	const key = `${section}_${field}`;
	if (!value || !String(value).trim()) {
		validationErrors.value[key] = `${label} è obbligatorio`;
		return false;
	}
	// Validazione specifica per telefono
	if (field === 'telephone_number') {
		const cleaned = String(value).replace(/\s/g, '');
		if (cleaned.length < 6 || !/^[+\d][\d\s-]{5,}$/.test(cleaned)) {
			validationErrors.value[key] = 'Inserisci un numero di telefono valido';
			return false;
		}
	}
	// Validazione CAP
	if (field === 'postal_code') {
		const cleaned = String(value).replace(/[^0-9]/g, '');
		if (cleaned.length < 4 || cleaned.length > 5) {
			validationErrors.value[key] = 'Inserisci un CAP valido (5 cifre)';
			return false;
		}
	}
	// Validazione email (solo se compilata)
	if (field === 'email' && value && String(value).trim()) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(String(value).trim())) {
			validationErrors.value[key] = 'Inserisci un indirizzo email valido';
			return false;
		}
	}
	delete validationErrors.value[key];
	return true;
};

const validateForm = () => {
	validationErrors.value = {};
	showValidation.value = true;
	let isValid = true;

	// Campi obbligatori partenza
	const originFields = [
		['full_name', originAddress.value.full_name, 'Nome e Cognome'],
		['address', originAddress.value.address, 'Indirizzo'],
		['address_number', originAddress.value.address_number, 'Numero civico'],
		['city', originAddress.value.city, 'Città'],
		['province', originAddress.value.province, 'Provincia'],
		['postal_code', originAddress.value.postal_code, 'CAP'],
		['telephone_number', originAddress.value.telephone_number, 'Telefono'],
	];

	for (const [field, value, label] of originFields) {
		if (!validateField('origin', field, value, label)) isValid = false;
	}

	// Email partenza (opzionale ma se presente deve essere valida)
	if (originAddress.value.email) {
		validateField('origin', 'email', originAddress.value.email, 'Email');
	}

	// Campi obbligatori destinazione
	const destFields = [
		['full_name', destinationAddress.value.full_name, 'Nome e Cognome'],
		['address', destinationAddress.value.address, 'Indirizzo'],
		['address_number', destinationAddress.value.address_number, 'Numero civico'],
		['city', destinationAddress.value.city, 'Città'],
		['province', destinationAddress.value.province, 'Provincia'],
		['postal_code', destinationAddress.value.postal_code, 'CAP'],
		['telephone_number', destinationAddress.value.telephone_number, 'Telefono'],
	];

	for (const [field, value, label] of destFields) {
		if (!validateField('dest', field, value, label)) isValid = false;
	}

	// Email destinazione (opzionale ma se presente deve essere valida)
	if (destinationAddress.value.email) {
		validateField('dest', 'email', destinationAddress.value.email, 'Email');
	}

	return isValid;
};

const getFieldError = (section, field) => {
	if (!showValidation.value) return null;
	return validationErrors.value[`${section}_${field}`] || null;
};

const fieldClass = (section, field) => {
	const hasError = getFieldError(section, field);
	return hasError ? 'input-preventivo-step-2 !border-red-400 !bg-red-50/30' : 'input-preventivo-step-2';
};

const days = ["Lun", "Mar", "Mer", "Gio", "Ven"];

/* Controllo visibilità campi indirizzo */
const showAddressFields = ref(false);
const dateError = ref(null);

const openAddressFields = () => {
	dateError.value = null;

	// Giorno di ritiro obbligatorio
	if (!services.value.date) {
		dateError.value = "Seleziona un giorno di ritiro prima di continuare.";
		return;
	}

	showAddressFields.value = true;
};

const goBackToServices = () => {
	showAddressFields.value = false;
};

const formRef = ref(null);

const { endpoint, refresh: refreshCart } = useCart();
const { isAuthenticated } = useSanctumAuth();
const router = useRouter();

const isSubmitting = ref(false);
const submitError = ref(null);
const showSavedPopup = ref(false);
const showSummary = ref(false);

const goToCart = async () => {
	showSavedPopup.value = false;
	await router.push("/carrello");
};

const addAnotherShipment = () => {
	showSavedPopup.value = false;
	router.push("/");
};

const goToSavedShipments = () => {
	showSavedPopup.value = false;
	router.push("/account/spedizioni");
};

const toAddressPayload = (addressData) => ({
	type: addressData.type || "Partenza",
	name: (addressData.full_name || "N/D").trim(),
	additional_information: addressData.additional_information || "",
	address: (addressData.address || "N/D").trim(),
	number_type: "Numero Civico",
	address_number: (addressData.address_number || "SNC").trim(),
	intercom_code: addressData.intercom_code || "",
	country: addressData.country || "Italia",
	city: (addressData.city || "N/D").trim(),
	postal_code: String(addressData.postal_code || "00000").replace(/[^0-9]/g, "") || "00000",
	province: (addressData.province || "N/D").trim(),
	telephone_number: String(addressData.telephone_number || "0000000000").trim(),
	email: addressData.email || "",
});

/* Step 1: Valida e mostra riepilogo */
const showRiepilogo = async () => {
	submitError.value = null;

	// Giorno di ritiro obbligatorio
	if (!services.value.date) {
		submitError.value = "Seleziona un giorno di ritiro.";
		return;
	}

	// Validazione personalizzata dei campi
	if (!validateForm()) {
		const errorCount = Object.keys(validationErrors.value).length;
		submitError.value = `Compila tutti i campi obbligatori. ${errorCount} ${errorCount === 1 ? 'campo mancante' : 'campi mancanti'}.`;

		// Scroll al primo campo con errore
		await nextTick();
		const firstErrorEl = document.querySelector('.\\!border-red-400');
		if (firstErrorEl) {
			firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
			firstErrorEl.focus();
		}
		return;
	}

	const packages = session.value?.data?.packages || [];
	if (!packages.length) {
		submitError.value = "Nessun collo disponibile. Torna al preventivo rapido.";
		return;
	}

	showSummary.value = true;
	await nextTick();
	window.scrollTo({ top: 0, behavior: 'smooth' });
};

const goBackFromSummary = () => {
	showSummary.value = false;
};

/* Step 2: Conferma e salva spedizione */
const confirmShipment = async () => {
	submitError.value = null;
	isSubmitting.value = true;

	try {
		const packages = session.value?.data?.packages || [];
		const payload = {
			origin_address: toAddressPayload(originAddress.value),
			destination_address: toAddressPayload(destinationAddress.value),
			services: {
				service_type: userStore.servicesArray.join(", "),
				date: services.value.date || "",
				time: services.value.time || "",
			},
			packages,
		};

		await useSanctumFetch(endpoint.value, {
			method: "POST",
			body: payload,
		});

		await refreshCart();
		await refresh();
		showSavedPopup.value = true;
	} catch (error) {
		const statusCode = error?.response?.status || error?.statusCode;
		if (statusCode === 422) {
			submitError.value = "Dati spedizione non validi. Controlla indirizzi, CAP e telefono.";
		} else {
			submitError.value = "Errore durante il salvataggio della spedizione. Riprova.";
		}
	} finally {
		isSubmitting.value = false;
	}
};

</script>

<template>
	<section>
		<div class="my-container mt-[72px] mb-[120px]">
			<div v-if="status === 'pending'" class="min-h-[720px] bg-[#E4E4E4] rounded-[20px] animate-pulse"></div>
			<form v-else ref="formRef" @submit.prevent="showRiepilogo">
				<Steps />

				<!-- STEP FORM: Servizi + Indirizzi -->
				<div v-if="!showSummary">

				<UModal
					:dismissible="true"
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

							<button type="button" class="bg-[#203A72] text-white px-[25px] cursor-pointer ml-[125px] font-normal text-[1.125rem] rounded-[15px] h-[39px] leading-[39px]" @click="addService()">
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
												 />
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
										 />
								</label>
							</div>

							<!-- Bottone per aprire i campi indirizzo -->
							<div v-if="!showAddressFields" class="mt-[40px] text-center">
								<p v-if="dateError" class="text-red-500 text-[0.9375rem] mb-[16px] font-medium">{{ dateError }}</p>
								<button
									type="button"
									@click="openAddressFields"
									class="bg-[#095866] text-white font-semibold text-[1rem] px-[32px] h-[52px] rounded-[30px] hover:bg-[#0a7a8c] transition cursor-pointer">
									Compila dati ritiro e destinazione
								</button>
							</div>

							<!-- PARTENZA -->
							<template v-if="showAddressFields">
							<div class="bg-[#E4E4E4] rounded-[20px] text-[#252B42] mt-[20px] pl-[40px] pr-[40px] pt-[35px] pb-[43px]">
								<h2 class="font-bold text-[1.125rem] tracking-[0.1px] mb-[39px]">
									Partenza
								</h2>

								<div class="flex items-start gap-x-[30px]">
									<div class="desktop:w-[324px]">
										<label for="origin_name" class="block text-[0.875rem] sr-only">Nome e Cognome*</label>
										<input type="text" placeholder="Nome e Cognome*" v-model="originAddress.full_name" id="origin_name" :class="fieldClass('origin', 'full_name')" required />
										<p v-if="getFieldError('origin', 'full_name')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'full_name') }}</p>
									</div>

									<div class="desktop:w-[324px]">
										<label for="origin_additional_info" class="block text-[0.875rem] sr-only">Informazioni aggiuntive</label>
										<input type="text" placeholder="Informazioni aggiuntive" v-model="originAddress.additional_information" id="origin_additional_info" class="input-preventivo-step-2" />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[25px]">
									<div class="desktop:w-[285px]">
										<label for="origin_address" class="block text-[0.875rem] sr-only">Indirizzo*</label>
										<input type="text" placeholder="Indirizzo*" v-model="originAddress.address" id="origin_address" :class="fieldClass('origin', 'address')" required />
										<p v-if="getFieldError('origin', 'address')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'address') }}</p>
									</div>

									<div class="desktop:w-[213px]">
										<label for="origin_address_number" class="block text-[0.875rem] sr-only">Numero civico*</label>
										<input type="text" placeholder="Numero civico*" v-model="originAddress.address_number" id="origin_address_number" :class="fieldClass('origin', 'address_number')" required />
										<p v-if="getFieldError('origin', 'address_number')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'address_number') }}</p>
									</div>

									<div class="desktop:w-[213px]">
										<label for="origin_intercom" class="block text-[0.875rem] sr-only">Citofono</label>
										<input type="text" placeholder="Citofono" v-model="originAddress.intercom_code" id="origin_intercom" class="input-preventivo-step-2" />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[25px]">
									<div class="desktop:w-[174px]">
										<label for="origin_country" class="block text-[0.875rem] sr-only">Paese*</label>
										<input type="text" placeholder="Paese*" value="Italia" id="origin_country" class="input-preventivo-step-2" disabled />
									</div>

									<div class="desktop:w-[171px]">
										<label for="origin_city" class="block text-[0.875rem] sr-only">Città*</label>
										<input type="text" placeholder="Città*" v-model="originAddress.city" id="origin_city" :class="fieldClass('origin', 'city')" required />
										<p v-if="getFieldError('origin', 'city')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'city') }}</p>
									</div>

									<div class="desktop:w-[170px]">
										<label for="origin_province" class="block text-[0.875rem] sr-only">Provincia*</label>
										<input type="text" placeholder="Provincia*" v-model="originAddress.province" id="origin_province" :class="fieldClass('origin', 'province')" required />
										<p v-if="getFieldError('origin', 'province')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'province') }}</p>
									</div>

									<div class="desktop:w-[174px]">
										<label for="origin_postal_code" class="block text-[0.875rem] sr-only">CAP*</label>
										<input type="text" placeholder="CAP*" v-model="originAddress.postal_code" id="origin_postal_code" :class="fieldClass('origin', 'postal_code')" required />
										<p v-if="getFieldError('origin', 'postal_code')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'postal_code') }}</p>
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[30px]">
									<div class="desktop:w-[324px]">
										<label for="origin_telephone" class="block text-[0.875rem] sr-only">Telefono*</label>
										<input type="tel" placeholder="Telefono*" v-model="originAddress.telephone_number" id="origin_telephone" :class="fieldClass('origin', 'telephone_number')" required />
										<p v-if="getFieldError('origin', 'telephone_number')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'telephone_number') }}</p>
									</div>

									<div class="desktop:w-[324px]">
										<label for="origin_email" class="block text-[0.875rem] sr-only">Email</label>
										<input type="email" placeholder="Email" v-model="originAddress.email" id="origin_email" :class="fieldClass('origin', 'email')" />
										<p v-if="getFieldError('origin', 'email')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'email') }}</p>
									</div>
								</div>
							</div>

							<!-- DESTINAZIONE -->
							<div class="bg-[#E4E4E4] rounded-[20px] text-[#252B42] mt-[20px] pl-[40px] pr-[40px] pt-[35px] pb-[43px]">
								<h2 class="font-bold text-[1.125rem] tracking-[0.1px] mb-[39px]">
									Destinazione
								</h2>

								<div class="flex items-start gap-x-[30px]">
									<div class="desktop:w-[324px]">
										<label for="dest_name" class="block text-[0.875rem] sr-only">Nome e Cognome*</label>
										<input type="text" placeholder="Nome e Cognome*" v-model="destinationAddress.full_name" id="dest_name" :class="fieldClass('dest', 'full_name')" required />
										<p v-if="getFieldError('dest', 'full_name')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'full_name') }}</p>
									</div>

									<div class="desktop:w-[324px]">
										<label for="dest_additional_info" class="block text-[0.875rem] sr-only">Informazioni aggiuntive</label>
										<input type="text" placeholder="Informazioni aggiuntive" v-model="destinationAddress.additional_information" id="dest_additional_info" class="input-preventivo-step-2" />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[25px]">
									<div class="desktop:w-[285px]">
										<label for="dest_address" class="block text-[0.875rem] sr-only">Indirizzo*</label>
										<input type="text" placeholder="Indirizzo*" v-model="destinationAddress.address" id="dest_address" :class="fieldClass('dest', 'address')" required />
										<p v-if="getFieldError('dest', 'address')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'address') }}</p>
									</div>

									<div class="desktop:w-[213px]">
										<label for="dest_address_number" class="block text-[0.875rem] sr-only">Numero civico*</label>
										<input type="text" placeholder="Numero civico*" v-model="destinationAddress.address_number" id="dest_address_number" :class="fieldClass('dest', 'address_number')" required />
										<p v-if="getFieldError('dest', 'address_number')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'address_number') }}</p>
									</div>

									<div class="desktop:w-[213px]">
										<label for="dest_intercom" class="block text-[0.875rem] sr-only">Citofono</label>
										<input type="text" placeholder="Citofono" v-model="destinationAddress.intercom_code" id="dest_intercom" class="input-preventivo-step-2" />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[25px]">
									<div class="desktop:w-[174px]">
										<label for="dest_country" class="block text-[0.875rem] sr-only">Paese*</label>
										<input type="text" placeholder="Paese*" value="Italia" id="dest_country" class="input-preventivo-step-2" disabled />
									</div>

									<div class="desktop:w-[171px]">
										<label for="dest_city" class="block text-[0.875rem] sr-only">Città*</label>
										<input type="text" placeholder="Città*" v-model="destinationAddress.city" id="dest_city" :class="fieldClass('dest', 'city')" required />
										<p v-if="getFieldError('dest', 'city')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'city') }}</p>
									</div>

									<div class="desktop:w-[170px]">
										<label for="dest_province" class="block text-[0.875rem] sr-only">Provincia*</label>
										<input type="text" placeholder="Provincia*" v-model="destinationAddress.province" id="dest_province" :class="fieldClass('dest', 'province')" required />
										<p v-if="getFieldError('dest', 'province')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'province') }}</p>
									</div>

									<div class="desktop:w-[174px]">
										<label for="dest_postal_code" class="block text-[0.875rem] sr-only">CAP*</label>
										<input type="text" placeholder="CAP*" v-model="destinationAddress.postal_code" id="dest_postal_code" :class="fieldClass('dest', 'postal_code')" required />
										<p v-if="getFieldError('dest', 'postal_code')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'postal_code') }}</p>
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[30px]">
									<div class="desktop:w-[324px]">
										<label for="dest_telephone" class="block text-[0.875rem] sr-only">Telefono*</label>
										<input type="tel" placeholder="Telefono*" v-model="destinationAddress.telephone_number" id="dest_telephone" :class="fieldClass('dest', 'telephone_number')" required />
										<p v-if="getFieldError('dest', 'telephone_number')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'telephone_number') }}</p>
									</div>

									<div class="desktop:w-[324px]">
										<label for="dest_email" class="block text-[0.875rem] sr-only">Email</label>
										<input type="email" placeholder="Email" v-model="destinationAddress.email" id="dest_email" :class="fieldClass('dest', 'email')" />
										<p v-if="getFieldError('dest', 'email')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'email') }}</p>
									</div>
								</div>
							</div>

						</template>
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


				<div class="mt-[28px] w-full max-w-[850px] mr-auto flex flex-wrap gap-[12px] items-center justify-between">
					<template v-if="showAddressFields">
						<button
							type="button"
							@click="goBackToServices"
							class="inline-flex items-center justify-center h-[52px] px-[24px] rounded-[30px] bg-[#095866] text-white font-semibold hover:bg-[#0a7a8c] transition cursor-pointer">
							Indietro
						</button>
						<button
							type="submit"
							:disabled="isSubmitting"
							class="bg-[#E44203] text-white font-semibold text-[1rem] px-[28px] h-[52px] rounded-[30px] hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed">
							{{ isSubmitting ? 'Salvataggio in corso...' : 'Continua e vai al carrello' }}
						</button>
					</template>
					<template v-else>
						<NuxtLink :to="{ path: '/', hash: '#preventivo' }" class="inline-flex items-center justify-center h-[52px] px-[24px] rounded-[30px] bg-[#095866] text-white font-semibold hover:bg-[#0a7a8c] transition">
							Indietro
						</NuxtLink>
					</template>
				</div>
				<div v-if="submitError" class="mt-[16px] w-full max-w-[850px] mr-auto p-[14px] bg-red-50 border border-red-200 rounded-[12px] flex items-center gap-[10px]">
					<Icon name="mdi:alert-circle" class="text-[20px] text-red-500 shrink-0" />
					<p class="text-red-600 text-[0.9375rem] font-medium">{{ submitError }}</p>
				</div>
				</div>

				<!-- RIEPILOGO -->
				<div v-if="showSummary" class="mt-[40px]">
					<h2 class="text-[1.5rem] font-bold text-[#252B42] font-montserrat mb-[24px]">Riepilogo spedizione</h2>

					<div class="bg-white rounded-[16px] border border-[#E9EBEC] p-[32px] max-w-[850px]">
						<!-- Giorno ritiro -->
						<div class="mb-[24px] pb-[24px] border-b border-[#E9EBEC]">
							<h3 class="text-[0.8125rem] font-semibold text-[#737373] uppercase tracking-wider mb-[8px]">Giorno di ritiro</h3>
							<p class="text-[1rem] font-semibold text-[#252B42]">{{ services.date }}</p>
						</div>

						<!-- Partenza -->
						<div class="mb-[24px] pb-[24px] border-b border-[#E9EBEC]">
							<h3 class="text-[0.8125rem] font-semibold text-[#737373] uppercase tracking-wider mb-[8px]">Partenza</h3>
							<p class="text-[0.9375rem] text-[#252B42] font-semibold">{{ originAddress.full_name }}</p>
							<p class="text-[0.875rem] text-[#404040]">{{ originAddress.address }} {{ originAddress.address_number }}, {{ originAddress.postal_code }} {{ originAddress.city }} ({{ originAddress.province }})</p>
							<p class="text-[0.875rem] text-[#737373]">Tel: {{ originAddress.telephone_number }}<span v-if="originAddress.email"> - {{ originAddress.email }}</span></p>
						</div>

						<!-- Destinazione -->
						<div class="mb-[24px] pb-[24px] border-b border-[#E9EBEC]">
							<h3 class="text-[0.8125rem] font-semibold text-[#737373] uppercase tracking-wider mb-[8px]">Destinazione</h3>
							<p class="text-[0.9375rem] text-[#252B42] font-semibold">{{ destinationAddress.full_name }}</p>
							<p class="text-[0.875rem] text-[#404040]">{{ destinationAddress.address }} {{ destinationAddress.address_number }}, {{ destinationAddress.postal_code }} {{ destinationAddress.city }} ({{ destinationAddress.province }})</p>
							<p class="text-[0.875rem] text-[#737373]">Tel: {{ destinationAddress.telephone_number }}<span v-if="destinationAddress.email"> - {{ destinationAddress.email }}</span></p>
						</div>

						<!-- Colli -->
						<div class="mb-[24px] pb-[24px] border-b border-[#E9EBEC]">
							<h3 class="text-[0.8125rem] font-semibold text-[#737373] uppercase tracking-wider mb-[8px]">Colli</h3>
							<div v-for="(pack, i) in session?.data?.packages" :key="i" class="text-[0.875rem] text-[#252B42]">
								<span class="font-semibold">{{ pack.quantity }}x</span> - {{ pack.weight }} kg ({{ pack.first_size }} x {{ pack.second_size }} x {{ pack.third_size }} cm)
							</div>
						</div>

						<!-- Servizi -->
						<div class="mb-[24px] pb-[24px] border-b border-[#E9EBEC]">
							<h3 class="text-[0.8125rem] font-semibold text-[#737373] uppercase tracking-wider mb-[8px]">Servizi</h3>
							<ul v-if="userStore.servicesArray.length > 0" class="text-[0.875rem] text-[#252B42]">
								<li v-for="s in userStore.servicesArray" :key="s">{{ s }}</li>
							</ul>
							<p v-else class="text-[0.875rem] text-[#737373]">Nessun servizio aggiuntivo selezionato</p>
						</div>

						<!-- Importo -->
						<div>
							<h3 class="text-[0.8125rem] font-semibold text-[#737373] uppercase tracking-wider mb-[8px]">Importo</h3>
							<p class="text-[1.75rem] font-bold text-[#252B42]">{{ session?.data?.total_price }}€ <span class="text-[0.75rem] font-normal text-[#737373]">IVA inclusa</span></p>
						</div>
					</div>

					<!-- Bottoni riepilogo -->
					<div class="mt-[28px] flex flex-wrap gap-[12px] items-center justify-between max-w-[850px]">
						<button
							type="button"
							@click="goBackFromSummary"
							class="inline-flex items-center justify-center h-[52px] px-[24px] rounded-[30px] bg-[#095866] text-white font-semibold hover:bg-[#0a7a8c] transition cursor-pointer">
							Modifica
						</button>
						<button
							type="button"
							@click="confirmShipment"
							:disabled="isSubmitting"
							class="bg-[#E44203] text-white font-semibold text-[1rem] px-[28px] h-[52px] rounded-[30px] hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
							{{ isSubmitting ? 'Conferma in corso...' : 'Conferma spedizione' }}
						</button>
					</div>
					<div v-if="submitError" class="mt-[16px] max-w-[850px] p-[14px] bg-red-50 border border-red-200 rounded-[12px] flex items-center gap-[10px]">
						<Icon name="mdi:alert-circle" class="text-[20px] text-red-500 shrink-0" />
						<p class="text-red-600 text-[0.9375rem] font-medium">{{ submitError }}</p>
					</div>
				</div>

			</form>
		</div>

		<!-- Shipment Saved Popup -->
		<UModal v-model:open="showSavedPopup" :dismissible="true" :close="false">
			<template #title>
				<div class="flex items-center gap-[12px]">
					<div class="w-[48px] h-[48px] rounded-full bg-emerald-100 flex items-center justify-center">
						<Icon name="mdi:check-circle" class="text-[28px] text-emerald-600" />
					</div>
					<h3 class="text-[1.25rem] font-bold text-[#252B42]">Spedizione salvata!</h3>
				</div>
			</template>
			<template #body>
				<p class="text-[#737373] text-[0.9375rem] leading-[1.6] mb-[24px]">
					La tua spedizione è stata configurata e salvata con successo. Cosa vuoi fare ora?
				</p>
				<div class="flex flex-col gap-[12px]">
					<button
						@click="goToCart"
						class="w-full flex items-center gap-[14px] p-[16px] rounded-[12px] border border-[#E9EBEC] hover:border-[#095866] hover:bg-[#f0fafb] transition-all cursor-pointer group">
						<div class="w-[44px] h-[44px] rounded-[10px] bg-[#095866]/10 flex items-center justify-center shrink-0">
							<Icon name="mdi:cart-outline" class="text-[22px] text-[#095866]" />
						</div>
						<div class="text-left">
							<p class="text-[0.9375rem] font-semibold text-[#252B42] group-hover:text-[#095866]">Vai al carrello</p>
							<p class="text-[0.8125rem] text-[#737373]">Procedi al pagamento della spedizione</p>
						</div>
						<Icon name="mdi:chevron-right" class="text-[20px] text-[#C8CCD0] ml-auto" />
					</button>

					<button
						@click="goToSavedShipments"
						class="w-full flex items-center gap-[14px] p-[16px] rounded-[12px] border border-[#E9EBEC] hover:border-[#095866] hover:bg-[#f0fafb] transition-all cursor-pointer group">
						<div class="w-[44px] h-[44px] rounded-[10px] bg-blue-50 flex items-center justify-center shrink-0">
							<Icon name="mdi:package-variant-closed" class="text-[22px] text-blue-600" />
						</div>
						<div class="text-left">
							<p class="text-[0.9375rem] font-semibold text-[#252B42] group-hover:text-[#095866]">Spedizioni configurate</p>
							<p class="text-[0.8125rem] text-[#737373]">Visualizza tutte le spedizioni salvate</p>
						</div>
						<Icon name="mdi:chevron-right" class="text-[20px] text-[#C8CCD0] ml-auto" />
					</button>

					<button
						@click="addAnotherShipment"
						class="w-full flex items-center gap-[14px] p-[16px] rounded-[12px] border border-[#E9EBEC] hover:border-[#095866] hover:bg-[#f0fafb] transition-all cursor-pointer group">
						<div class="w-[44px] h-[44px] rounded-[10px] bg-orange-50 flex items-center justify-center shrink-0">
							<Icon name="mdi:plus-circle-outline" class="text-[22px] text-orange-600" />
						</div>
						<div class="text-left">
							<p class="text-[0.9375rem] font-semibold text-[#252B42] group-hover:text-[#095866]">Aggiungi un'altra spedizione</p>
							<p class="text-[0.8125rem] text-[#737373]">Configura una nuova spedizione</p>
						</div>
						<Icon name="mdi:chevron-right" class="text-[20px] text-[#C8CCD0] ml-auto" />
					</button>
				</div>
			</template>
		</UModal>
	</section>
</template>

<style scoped>
.swiper-slide {
	background: #f1f1f1;
	border-radius: 10px;
}

.input-preventivo-step-2 {
	font-family: "Montserrat", sans-serif;
	background: #ffffff !important;
	box-shadow: 0 1px 0 rgba(0,0,0,0.03) inset;
	border: 1px solid #d9dde3;
	border-radius: 8px;
	padding: 12px 10px;
	color: #252b42;
}

.title-popup::after {
	background-image: var(--before-bg);
	width: 26px;
	height: 28px;
}
</style>
