<!--
  FILE: pages/account/indirizzi/index.vue
  SCOPO: Rubrica indirizzi — CRUD completo degli indirizzi salvati dall'utente.
         Card layout con predefinito, creazione, modifica, eliminazione con conferma inline.
  API: GET /api/user-addresses — lista indirizzi,
       POST /api/user-addresses — crea nuovo,
       PATCH /api/user-addresses/{id} — modifica / imposta predefinito,
       DELETE /api/user-addresses/{id} — elimina.
  COMPONENTI: nessun componente custom (solo Icon di Nuxt).
  ROUTE: /account/indirizzi (middleware sanctum:auth).

  DATI IN INGRESSO:
    - addresses (da useSanctumFetch) — lista indirizzi dal server.
    - provinceList — elenco completo province italiane (hardcoded).

  DATI IN USCITA:
    - POST/PATCH/DELETE su /api/user-addresses — operazioni CRUD.

  VINCOLI:
    - L'utente deve essere autenticato (middleware sanctum:auth).
    - Ogni indirizzo ha: name, address, city, postal_code, province_name, default.
    - Un solo indirizzo puo' essere predefinito alla volta.

  ERRORI TIPICI:
    - Errore di validazione dal backend (CAP malformato, campi mancanti).
    - Errore di rete durante eliminazione.

  PUNTI DI MODIFICA SICURI:
    - Aggiungere campi all'indirizzo: aggiungere in newAddress, editedAddress, form e API body.
    - Cambiare il limite massimo di indirizzi: gestito lato backend.

  COLLEGAMENTI:
    - pages/account/index.vue → dashboard account (breadcrumb).
    - pages/riepilogo.vue → gli indirizzi salvati possono essere usati nel riepilogo spedizione.
-->
<script setup>
/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ["app-auth"],
});

const route = useRoute();
const router = useRouter();

/* Lista completa delle province italiane per il menu a tendina */
const provinceList = ref([
	"AG - Agrigento", "AL - Alessandria", "AN - Ancona", "AO - Aosta",
	"AP - Ascoli Piceno", "AQ - L'Aquila", "AR - Arezzo", "AT - Asti",
	"AV - Avellino", "BA - Bari", "BG - Bergamo", "BI - Biella",
	"BL - Belluno", "BN - Benevento", "BO - Bologna", "BR - Brindisi",
	"BS - Brescia", "BT - Barletta-Andria-Trani", "BZ - Bolzano/Bozen",
	"CA - Cagliari", "CB - Campobasso", "CE - Caserta", "CH - Chieti",
	"CI - Sulcis Iglesiente", "CL - Caltanissetta", "CN - Cuneo",
	"CO - Como", "CR - Cremona", "CS - Cosenza", "CT - Catania",
	"CZ - Catanzaro", "EN - Enna", "FC - Forlì-Cesena", "FE - Ferrara",
	"FG - Foggia", "FI - Firenze", "FM - Fermo", "FR - Frosinone",
	"GE - Genova", "GO - Gorizia", "GR - Grosseto", "IM - Imperia",
	"IS - Isernia", "KR - Crotone", "LC - Lecco", "LE - Lecce",
	"LI - Livorno", "LO - Lodi", "LT - Latina", "LU - Lucca",
	"MB - Monza e Brianza", "MC - Macerata", "ME - Messina", "MI - Milano",
	"MN - Mantova", "MO - Modena", "MS - Massa-Carrara", "MT - Matera",
	"NA - Napoli", "NO - Novara", "NU - Nuoro", "OR - Oristano",
	"PA - Palermo", "PC - Piacenza", "PD - Padova", "PE - Pescara",
	"PG - Perugia", "PI - Pisa", "PN - Pordenone", "PO - Prato",
	"PR - Parma", "PT - Pistoia", "PU - Pesaro e Urbino", "PV - Pavia",
	"PZ - Potenza", "RA - Ravenna", "RC - Reggio Calabria",
	"RE - Reggio Emilia", "RG - Ragusa", "RI - Rieti", "RM - Roma",
	"RN - Rimini", "RO - Rovigo", "SA - Salerno", "SI - Siena",
	"SO - Sondrio", "SP - La Spezia", "SR - Siracusa", "SS - Sassari",
	"SV - Savona", "TA - Taranto", "TE - Teramo", "TN - Trento",
	"TO - Torino", "TP - Trapani", "TR - Terni", "TS - Trieste",
	"TV - Treviso", "UD - Udine", "VA - Varese",
	"VB - Verbano-Cusio-Ossola", "VC - Vercelli", "VE - Venezia",
	"VI - Vicenza", "VR - Verona", "VT - Viterbo", "VV - Vibo Valentia",
	"VS - Medio Campidano",
]);

/* Dati del nuovo indirizzo da creare */
const newAddress = ref({
	name: "",
	address: "",
	city: "",
	postal_code: "",
	province_name: "",
	default: false,
});

/* Messaggi di feedback */
const messageError = ref(null);
const messageSuccess = ref(null);
const messageLoading = ref(null);

/* Stato visualizzazione form */
const showEditForm = ref(false);
const showCreateForm = ref(false);
const editedAddress = ref(null);

/* ID dell'indirizzo da eliminare (per conferma inline) */
const deleteConfirmId = ref(null);
/* Indica se l'eliminazione e' in corso */
const deleteLoading = ref(false);

/* Carica la lista degli indirizzi salvati dal server */
const {
	data: addresses,
	error,
	status,
	refresh: refreshAddress,
// lazy: true — la rubrica indirizzi si carica dopo il render iniziale della pagina
} = useSanctumFetch(`/api/user-addresses`, {
	method: "GET",
	lazy: true,
});

const sanctum = useSanctumClient();

/* Apre il form di modifica con i dati dell'indirizzo selezionato */
const edit = (address) => {
	editedAddress.value = { ...address };
	showEditForm.value = true;
	messageError.value = null;
	messageSuccess.value = null;
};

/* Chiude il form di modifica senza salvare */
const cancelEdit = () => {
	editedAddress.value = null;
	showEditForm.value = false;
	messageError.value = null;
};

/* Chiude il form di creazione e pulisce i campi */
const cancelAdd = () => {
	newAddress.value = { name: "", address: "", city: "", postal_code: "", province_name: "", default: false };
	showCreateForm.value = false;
	messageError.value = null;
};

/* Salva un nuovo indirizzo nel server, poi ricarica la lista */
const createAddress = async () => {
	messageError.value = null;
	messageLoading.value = "Aggiunta in corso...";

	try {
		await sanctum(`/api/user-addresses`, {
			method: "POST",
			body: newAddress.value,
		});

		await refreshAddress();
		newAddress.value = { name: "", address: "", city: "", postal_code: "", province_name: "", default: false };
		showCreateForm.value = false;
		messageLoading.value = null;
		messageSuccess.value = "Indirizzo aggiunto con successo!";
		setTimeout(() => { messageSuccess.value = null; }, 4000);
	} catch (error) {
		messageError.value = error?.data?.message || "Errore durante l'aggiunta. Riprova.";
		messageLoading.value = null;
	}
};

/* Salva le modifiche a un indirizzo esistente */
const editAddress = async () => {
	messageError.value = null;
	messageLoading.value = "Salvataggio in corso...";

	try {
		await sanctum(`/api/user-addresses/${editedAddress.value.id}`, {
			method: "PATCH",
			body: {
				name: editedAddress.value.name,
				address: editedAddress.value.address,
				city: editedAddress.value.city,
				province_name: editedAddress.value.province_name,
				postal_code: editedAddress.value.postal_code,
			},
		});

		await refreshAddress();
		showEditForm.value = false;
		messageLoading.value = null;
		messageSuccess.value = "Indirizzo aggiornato con successo!";
		setTimeout(() => { messageSuccess.value = null; }, 4000);
	} catch (error) {
		messageError.value = error?.data?.message || "Errore durante il salvataggio. Riprova.";
		messageLoading.value = null;
	}
};

/* Imposta un indirizzo come predefinito */
const editDefaultAddress = async (address) => {
	messageError.value = null;
	try {
		await sanctum(`/api/user-addresses/${address.id}`, {
			method: "PATCH",
			body: { default: true },
		});
		await refreshAddress();
		messageSuccess.value = "Indirizzo predefinito aggiornato!";
		setTimeout(() => { messageSuccess.value = null; }, 3000);
	} catch (error) {
		messageError.value = "Errore durante l'aggiornamento. Riprova.";
	}
};

/* Elimina un indirizzo dal server e ricarica la lista */
const deleteAddress = async (id) => {
	deleteLoading.value = true;
	try {
		await sanctum(`/api/user-addresses/${id}`, {
			method: "DELETE",
		});
		await refreshAddress();
		deleteConfirmId.value = null;
		messageSuccess.value = "Indirizzo eliminato.";
		setTimeout(() => { messageSuccess.value = null; }, 3000);
	} catch (error) {
		messageError.value = "Errore durante l'eliminazione. Riprova.";
	} finally {
		deleteLoading.value = false;
	}
};

/* Rimuove la provincia attuale dalla lista (per evitare duplicati nel menu a tendina) */
const filteredProvinces = (address) => {
	return provinceList.value.filter((province) => province !== address.province_name);
};

/* Estrae la sigla della provincia (le prime 2 lettere) */
const getProvinceCode = (provinceName) => {
	if (!provinceName) return '';
	return provinceName.slice(0, 2);
};

const isAddressFormOpen = computed(() => showEditForm.value || showCreateForm.value);

const addressStats = computed(() => {
	const list = addresses.value?.data || [];
	return {
		total: list.length,
		defaults: list.filter((address) => address.default).length,
	};
});

const defaultAddressName = computed(() => {
	const list = addresses.value?.data || [];
	return list.find((address) => address.default)?.name || "Nessuno ancora";
});

const addressHeader = computed(() => {
	if (showEditForm.value) {
		return {
			eyebrow: 'Rubrica account',
			title: 'Modifica indirizzo',
			description: 'Aggiorna i riferimenti salvati senza perdere il ritmo della rubrica.',
		};
	}

	if (showCreateForm.value) {
		return {
			eyebrow: 'Rubrica account',
			title: 'Nuovo indirizzo',
			description: 'Aggiungi un indirizzo con campi chiari e pronti per le prossime spedizioni.',
		};
	}

	return {
		eyebrow: 'Rubrica account',
		title: 'I tuoi indirizzi',
		description: 'Salva indirizzi e riferimenti per compilare le spedizioni più velocemente.',
	};
});
</script>

<template>
	<section class="min-h-[600px] py-[32px] desktop:py-[72px]">
		<div class="my-container">
			<AccountPageHeader
				:eyebrow="addressHeader.eyebrow"
				:title="addressHeader.title"
				:description="addressHeader.description"
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Indirizzi' },
				]"
				:back-to="isAddressFormOpen ? '/account/indirizzi' : ''"
				back-label="Torna alla rubrica"
			>
				<template #meta>
					<div class="flex flex-wrap gap-[8px]">
						<span class="inline-flex items-center gap-[6px] rounded-full bg-[#095866]/10 px-[12px] py-[6px] text-[0.8125rem] font-semibold text-[#095866]">
							{{ addressStats.total }} salvati
						</span>
						<span class="inline-flex items-center gap-[6px] rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.8125rem] font-semibold text-[#095866]">
							{{ addressStats.defaults }} predefiniti
						</span>
					</div>
				</template>
				<template #actions v-if="!isAddressFormOpen">
					<button
						@click="showCreateForm = true; messageError = null; messageSuccess = null;"
						class="inline-flex items-center justify-center gap-[6px] px-[18px] py-[10px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] text-[0.875rem] font-semibold transition-colors cursor-pointer">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
						Aggiungi indirizzo
					</button>
				</template>
			</AccountPageHeader>

			<!-- Messaggi di feedback globali -->
				<div v-if="messageSuccess" class="mb-[20px] px-[16px] py-[12px] rounded-[16px] text-[0.875rem] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-[8px]">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="shrink-0 text-emerald-600"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/></svg>
					{{ messageSuccess }}
				</div>
				<div v-if="messageError && !showEditForm && !showCreateForm" class="mb-[20px] px-[16px] py-[12px] rounded-[16px] text-[0.875rem] font-medium bg-red-50 text-red-700 border border-red-200 flex items-center gap-[8px]">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="shrink-0 text-red-500"><path d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z"/></svg>
					{{ messageError }}
				</div>

				<!-- ===== LISTA INDIRIZZI ===== -->
				<template v-if="!showEditForm && !showCreateForm">
					<div class="mb-[18px] grid gap-[12px] desktop:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
						<div class="rounded-[18px] border border-[#E9EBEC] bg-white px-[16px] py-[14px] shadow-sm">
							<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#095866]">Vista rubrica</p>
							<h2 class="mt-[6px] text-[1rem] font-bold text-[#252B42]">Indirizzi ordinati e pronti all&apos;uso</h2>
							<p class="mt-[6px] text-[0.875rem] leading-[1.55] text-[#737373]">
								Mantieni in ordine i riferimenti più usati, aggiorna i dettagli in pochi tap e lascia sempre visibile quello principale.
							</p>
							<div class="mt-[12px] flex flex-wrap gap-[8px]">
								<span class="inline-flex items-center gap-[6px] rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.75rem] font-semibold text-[#095866]">
									<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M14.5,9A3.5,3.5 0 0,0 11,5.5A3.5,3.5 0 0,0 7.5,9A3.5,3.5 0 0,0 11,12.5A3.5,3.5 0 0,0 14.5,9M11,7A2,2 0 0,1 13,9A2,2 0 0,1 11,11A2,2 0 0,1 9,9A2,2 0 0,1 11,7M11,2C7.13,2 4,5.13 4,9C4,14.25 11,22 11,22C11,22 18,14.25 18,9A7,7 0 0,0 11,2M11,4A5,5 0 0,1 16,9C16,11.38 13.12,16.24 11,19.19C8.88,16.24 6,11.38 6,9A5,5 0 0,1 11,4Z"/></svg>
									{{ addressStats.total }} salvati
								</span>
								<span class="inline-flex items-center gap-[6px] rounded-full bg-[#FFF3EC] px-[12px] py-[6px] text-[0.75rem] font-semibold text-[#E44203]">
									<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.78L23,12M13,17H11V15H13V17M13,13H11V7H13V13Z"/></svg>
									{{ addressStats.defaults }} predefiniti
								</span>
							</div>
						</div>
						<div class="rounded-[18px] border border-[#DDECEE] bg-[#F8FCFD] px-[16px] py-[14px] shadow-sm">
							<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#095866]">Predefinito attivo</p>
							<p class="mt-[8px] text-[1rem] font-bold text-[#252B42]">{{ defaultAddressName }}</p>
							<p class="mt-[6px] text-[0.8125rem] leading-[1.55] text-[#737373]">
								Un indirizzo principale alla volta, tutto il resto resta sempre modificabile o eliminabile senza perdere la rubrica.
							</p>
						</div>
					</div>

				<!-- Loading skeleton -->
				<div v-if="!addresses" class="space-y-[12px]">
					<div v-for="n in 2" :key="n" class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] animate-pulse">
						<div class="flex items-center gap-[16px]">
							<div class="w-[44px] h-[44px] rounded-[50px] bg-gray-200"></div>
							<div class="flex-1 space-y-[8px]">
								<div class="h-[14px] bg-gray-200 rounded w-[50%]"></div>
								<div class="h-[12px] bg-gray-200 rounded w-[35%]"></div>
							</div>
						</div>
					</div>
				</div>

				<!-- Empty state -->
				<div v-else-if="addresses?.data?.length === 0" class="bg-white rounded-[16px] p-[48px] border border-[#E9EBEC] text-center">
					<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#C8CCD0"><path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"/></svg>
					</div>
					<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessun indirizzo salvato</h2>
					<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">
						Salva i tuoi indirizzi per velocizzare la compilazione delle spedizioni.
					</p>
					<button
						@click="showCreateForm = true"
						class="inline-flex items-center gap-[6px] px-[24px] py-[12px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
						Aggiungi il tuo primo indirizzo
					</button>
				</div>

				<!-- Elenco indirizzi come card -->
				<div v-else class="space-y-[10px]">
					<div
						v-for="(address, index) in addresses.data"
						:key="address.id"
						:class="[
							'bg-white rounded-[16px] p-[16px] desktop:p-[20px] border transition-all',
							address.default ? 'border-[#095866] shadow-sm' : 'border-[#E9EBEC] hover:border-[#D0D0D0]',
						]">
						<div class="flex flex-col gap-[12px] desktop:flex-row desktop:items-start desktop:gap-[16px]">
							<!-- Icona indirizzo -->
							<div :class="['w-[40px] h-[40px] rounded-[50px] flex items-center justify-center shrink-0', address.default ? 'bg-[#095866]/10' : 'bg-[#F8F9FB]']">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" :fill="address.default ? '#095866' : '#737373'"><path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"/></svg>
							</div>

							<!-- Dati indirizzo -->
							<div class="flex-1 min-w-0">
								<div class="flex flex-wrap items-center gap-[8px] mb-[4px]">
									<h3 class="text-[0.9375rem] font-bold text-[#252B42]">{{ address.name }}</h3>
									<span v-if="address.default" class="inline-block px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium bg-[#095866]/10 text-[#095866]">
										Predefinito
									</span>
								</div>
								<p class="text-[0.875rem] text-[#404040]">{{ address.address }}</p>
								<p class="text-[0.875rem] text-[#737373]">
									{{ address.postal_code }} {{ address.city }}
									<span v-if="address.province_name">({{ getProvinceCode(address.province_name) }})</span>
								</p>
							</div>

							<!-- Azioni -->
								<div class="flex flex-wrap gap-[8px] shrink-0 desktop:max-w-[220px] desktop:justify-end">
									<button
										v-if="!address.default"
										@click="editDefaultAddress(address)"
										class="inline-flex items-center justify-center gap-[4px] rounded-full border border-[#D7E8EA] bg-[#F8FCFD] px-[12px] py-[8px] text-[0.75rem] font-semibold text-[#095866] transition-colors hover:bg-[#EEF7F8] cursor-pointer">
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/></svg>
										Predefinito
									</button>
									<button
										@click="edit(address)"
										class="inline-flex items-center justify-center gap-[4px] rounded-full border border-[#E3E7EA] bg-white px-[12px] py-[8px] text-[0.75rem] font-semibold text-[#404040] transition-colors hover:bg-[#F8F9FB] cursor-pointer">
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>
										Modifica
									</button>

								<!-- Conferma eliminazione inline -->
									<template v-if="deleteConfirmId !== address.id">
										<button
											@click="deleteConfirmId = address.id"
											class="inline-flex items-center justify-center gap-[4px] rounded-full border border-[#F3D7D7] bg-white px-[12px] py-[8px] text-[0.75rem] font-semibold text-red-500 transition-colors hover:bg-red-50 cursor-pointer">
											<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z"/></svg>
											Elimina
										</button>
									</template>
									<template v-else>
										<div class="flex flex-wrap gap-[8px]">
											<button
												@click="deleteAddress(address.id)"
												:disabled="deleteLoading"
												class="inline-flex items-center justify-center gap-[4px] rounded-full bg-red-600 px-[12px] py-[8px] text-[0.75rem] font-semibold text-white cursor-pointer transition-colors hover:bg-red-700 disabled:opacity-60">
												<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
												{{ deleteLoading ? 'Eliminazione...' : 'Conferma' }}
											</button>
											<button
												@click="deleteConfirmId = null"
												class="inline-flex items-center justify-center gap-[4px] rounded-full border border-[#E3E7EA] bg-white px-[12px] py-[8px] text-[0.75rem] font-semibold text-[#404040] transition-colors hover:bg-[#F8F9FB] cursor-pointer">
												<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
												Annulla
											</button>
										</div>
									</template>
								</div>
							</div>
						</div>
					</div>
				</template>

				<!-- ===== FORM MODIFICA INDIRIZZO ===== -->
				<template v-if="showEditForm && editedAddress">
					<div class="bg-white rounded-[18px] p-[18px] desktop:p-[24px] shadow-sm border border-[#E9EBEC] max-w-[680px] mx-auto">
						<div class="mb-[18px] flex items-start gap-[12px] rounded-[16px] border border-[#E9EBEC] bg-[#F8FCFD] px-[14px] py-[12px]">
							<div class="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#095866]/10">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#095866"><path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z"/></svg>
							</div>
							<div>
								<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#095866]">Aggiorna riferimento</p>
								<h2 class="mt-[4px] text-[1rem] font-bold text-[#252B42]">Modifica indirizzo salvato</h2>
								<p class="mt-[4px] text-[0.8125rem] leading-[1.55] text-[#737373]">Mantieni i dati chiari e pronti per i prossimi riepiloghi spedizione.</p>
							</div>
						</div>
						<form @submit.prevent="editAddress">
						<div class="mb-[14px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Nome / Riferimento *</label>
							<input type="text" v-model="editedAddress.name" placeholder="es. Casa, Ufficio, Mario Rossi" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[10px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
						</div>
						<div class="mb-[14px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Indirizzo *</label>
							<input type="text" v-model="editedAddress.address" placeholder="Via Roma 10" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[10px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
						</div>
						<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px] mb-[14px]">
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Città *</label>
								<input type="text" v-model="editedAddress.city" placeholder="Roma" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[10px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
							</div>
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">CAP *</label>
								<input
									type="text"
									v-model="editedAddress.postal_code"
									placeholder="00100"
									maxlength="5"
									inputmode="numeric"
									pattern="[0-9]{5}"
									@input="editedAddress.postal_code = editedAddress.postal_code.replace(/[^0-9]/g, '')"
									class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[10px] text-[0.875rem] focus:border-[#095866] focus:outline-none"
									required />
							</div>
						</div>
						<div class="mb-[20px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Provincia *</label>
							<select v-model="editedAddress.province_name" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[10px] text-[0.875rem] focus:border-[#095866] focus:outline-none cursor-pointer" required>
								<option disabled :value="editedAddress.province_name">{{ editedAddress.province_name }}</option>
								<option v-for="(province, index) in filteredProvinces(editedAddress)" :key="index" :value="province">{{ province }}</option>
							</select>
						</div>

						<p v-if="messageLoading" class="text-center text-[0.875rem] text-[#095866] font-medium mb-[16px]">{{ messageLoading }}</p>
						<p v-if="messageError" class="text-center text-[0.875rem] text-red-600 font-medium mb-[16px] bg-red-50 p-[10px] rounded-[8px] border border-red-200">{{ messageError }}</p>

						<div class="flex flex-col gap-[12px] tablet:flex-row">
							<button type="button" @click.prevent="cancelEdit" class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
								Annulla
							</button>
							<button type="submit" :disabled="!!messageLoading" class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#095866] hover:bg-[#074a56] text-white font-semibold text-[0.9375rem] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/></svg>
								{{ messageLoading ? 'Salvataggio...' : 'Salva modifiche' }}
							</button>
						</div>
					</form>
				</div>
			</template>

				<!-- ===== FORM CREA INDIRIZZO ===== -->
				<template v-if="showCreateForm">
					<div class="bg-white rounded-[18px] p-[18px] desktop:p-[24px] shadow-sm border border-[#E9EBEC] max-w-[680px] mx-auto">
						<div class="mb-[18px] flex items-start gap-[12px] rounded-[16px] border border-[#E9EBEC] bg-[#F8FCFD] px-[14px] py-[12px]">
							<div class="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#095866]/10">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#095866"><path d="M9,11.5A2.5,2.5 0 0,0 11.5,9A2.5,2.5 0 0,0 9,6.5A2.5,2.5 0 0,0 6.5,9A2.5,2.5 0 0,0 9,11.5M9,2C12.86,2 16,5.13 16,9C16,14.25 9,22 9,22C9,22 2,14.25 2,9A7,7 0 0,1 9,2M15,17H18V14H20V17H23V19H20V22H18V19H15V17Z"/></svg>
							</div>
							<div>
								<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#095866]">Nuovo riferimento</p>
								<h2 class="mt-[4px] text-[1rem] font-bold text-[#252B42]">Aggiungi un indirizzo ordinato</h2>
								<p class="mt-[4px] text-[0.8125rem] leading-[1.55] text-[#737373]">Salva una destinazione pronta da riusare con un solo tap nelle prossime spedizioni.</p>
							</div>
						</div>
						<form @submit.prevent="createAddress">
						<div class="mb-[14px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Nome / Riferimento *</label>
							<input type="text" v-model="newAddress.name" placeholder="es. Casa, Ufficio, Mario Rossi" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[10px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
						</div>
						<div class="mb-[14px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Indirizzo *</label>
							<input type="text" v-model="newAddress.address" placeholder="Via Roma 10" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[10px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
						</div>
						<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px] mb-[14px]">
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Città *</label>
								<input type="text" v-model="newAddress.city" placeholder="Roma" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[10px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
							</div>
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">CAP *</label>
								<input
									type="text"
									v-model="newAddress.postal_code"
									placeholder="00100"
									maxlength="5"
									inputmode="numeric"
									pattern="[0-9]{5}"
									@input="newAddress.postal_code = newAddress.postal_code.replace(/[^0-9]/g, '')"
									class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[10px] text-[0.875rem] focus:border-[#095866] focus:outline-none"
									required />
							</div>
						</div>
						<div class="mb-[14px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Provincia *</label>
							<select v-model="newAddress.province_name" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[10px] text-[0.875rem] focus:border-[#095866] focus:outline-none cursor-pointer" required>
								<option disabled value="">Scegli la provincia</option>
								<option v-for="(province, index) in provinceList" :key="index" :value="province">{{ province }}</option>
							</select>
						</div>

						<label class="flex items-center gap-[8px] cursor-pointer mb-[20px]">
							<input type="checkbox" v-model="newAddress.default" :true-value="1" :false-value="0" class="w-[18px] h-[18px] accent-[#095866] cursor-pointer" />
							<span class="text-[0.8125rem] text-[#737373]">Usa come indirizzo predefinito</span>
						</label>

						<p v-if="messageLoading" class="text-center text-[0.875rem] text-[#095866] font-medium mb-[16px]">{{ messageLoading }}</p>
						<p v-if="messageError" class="text-center text-[0.875rem] text-red-600 font-medium mb-[16px] bg-red-50 p-[10px] rounded-[8px] border border-red-200">{{ messageError }}</p>

						<div class="flex flex-col gap-[12px] tablet:flex-row">
							<button type="button" @click.prevent="cancelAdd" class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
								Annulla
							</button>
							<button type="submit" :disabled="!!messageLoading" class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#095866] hover:bg-[#074a56] text-white font-semibold text-[0.9375rem] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
								{{ messageLoading ? 'Aggiunta...' : 'Aggiungi indirizzo' }}
							</button>
						</div>
					</form>
				</div>
			</template>
		</div>
	</section>
</template>
