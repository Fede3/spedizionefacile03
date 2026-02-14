/**
 * FILE: pages/account/profilo.vue
 * SCOPO: Profilo utente — visualizza/modifica dati personali, aziendali, fatturazione, password.
 * API: PUT /api/user (aggiorna profilo), POST /api/user/change-password.
 * ROUTE: /account/profilo (middleware sanctum:auth).
 */
<script setup>
/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ["sanctum:auth"],
});

/* refreshIdentity ricarica i dati utente dopo un salvataggio,
   user contiene i dati dell'utente, logout serve per uscire */
const { refreshIdentity, user, logout } = useSanctumAuth();

/* Messaggi mostrati all'utente: errore, successo e caricamento */
const messageError = ref(null);
const messageSuccess = ref(null);
const messageLoading = ref(null);

/* Controlla se mostrare il form di modifica o la vista di sola lettura */
const showEditForm = ref(false);

/**
 * Oggetto con tutti i campi modificabili del profilo utente.
 * Viene pre-compilato con i dati attuali dell'utente.
 */
const userInfo = ref({
	name: user.value?.name || "",
	surname: user.value?.surname || "",
	email: user.value?.email || "",
	password: "",
	password_confirmation: "",
	telephone_number: user.value?.telephone_number || "",
	user_type: user.value?.user_type || "privato",
	// Business data
	company_name: user.value?.company_name || "",
	vat_number: user.value?.vat_number || "",
	fiscal_code: user.value?.fiscal_code || "",
	pec: user.value?.pec || "",
	sdi_code: user.value?.sdi_code || "",
	// Billing data
	billing_name: user.value?.billing_name || "",
	billing_address: user.value?.billing_address || "",
	billing_city: user.value?.billing_city || "",
	billing_postal_code: user.value?.billing_postal_code || "",
	billing_province: user.value?.billing_province || "",
});

/* Se spuntato, i dati di fatturazione sono uguali a quelli di spedizione */
const billingSameAsShipping = ref(false);

/* Client per chiamare le API del backend (autenticato con cookie) */
const sanctum = useSanctumClient();

/**
 * Salva le modifiche al profilo.
 * Invia i dati al server, poi aggiorna i dati utente in locale.
 * Viene chiamata quando l'utente clicca "Salva modifiche" nel form.
 */
const updateInfo = async () => {
	messageError.value = null;
	messageSuccess.value = null;
	messageLoading.value = "Salvataggio in corso...";

	try {
		await sanctum(`/api/users/${user.value.id}`, {
			method: "PATCH",
			body: userInfo.value,
		});

		await refreshIdentity();
		messageSuccess.value = "Dati aggiornati con successo!";
		showEditForm.value = false;

		setTimeout(() => {
			messageSuccess.value = null;
		}, 4000);
	} catch (error) {
		if (error?.statusCode === 401) {
			navigateTo("/autenticazione");
			return;
		}
		const data = error?.data || error?.response?._data;
		if (data?.errors) {
			const firstError = Object.values(data.errors)[0];
			messageError.value = Array.isArray(firstError) ? firstError[0] : firstError;
		} else {
			messageError.value = "Errore durante l'aggiornamento. Riprova.";
		}
	} finally {
		messageLoading.value = null;
	}
};

/* Mostra il numero di telefono o un testo se non ancora inserito */
const getTelephoneNumber = (telephone_number) => {
	if (!telephone_number || telephone_number === "0") {
		return "Non ancora aggiunto";
	}
	return telephone_number;
};

/* Restituisce etichetta e colore del badge in base al ruolo utente (Cliente, Partner Pro, Admin) */
const getRoleBadge = (role) => {
	if (role === "Partner Pro") return { label: "Partner Pro", class: "bg-[#095866]/10 text-[#095866]" };
	if (role === "Admin") return { label: "Admin", class: "bg-purple-50 text-purple-700" };
	return { label: "Cliente", class: "bg-blue-50 text-blue-700" };
};

/* Esegue il logout e in caso di errore riporta alla homepage */
const handleLogout = async () => {
	try {
		await logout();
	} catch (error) {
		navigateTo("/");
	}
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container max-w-[800px]">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866]">Il tuo account</NuxtLink>
				<span class="mx-[6px]">/</span>
				<span v-if="!showEditForm" class="font-semibold text-[#252B42]">Profilo e dati</span>
				<template v-else>
					<NuxtLink class="hover:underline text-[#095866] cursor-pointer" @click.prevent="showEditForm = false">Profilo e dati</NuxtLink>
					<span class="mx-[6px]">/</span>
					<span class="font-semibold text-[#252B42]">Modifica dati</span>
				</template>
			</div>

			<!-- Success/Error Messages -->
			<div v-if="messageSuccess" class="mb-[20px] px-[16px] py-[12px] rounded-[10px] text-[0.875rem] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
				{{ messageSuccess }}
			</div>
			<div v-if="messageError" class="mb-[20px] px-[16px] py-[12px] rounded-[10px] text-[0.875rem] font-medium bg-red-50 text-red-700 border border-red-200">
				{{ messageError }}
			</div>

			<!-- ===== PROFILE VIEW ===== -->
			<template v-if="!showEditForm">
				<div class="flex items-center justify-between mb-[24px]">
					<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42]">Profilo e dati</h1>
					<button
						@click="showEditForm = true"
						class="inline-flex items-center gap-[6px] px-[20px] py-[10px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[10px] text-[0.875rem] font-semibold transition-colors cursor-pointer">
						<Icon name="mdi:pencil-outline" class="text-[16px]" />
						Modifica dati
					</button>
				</div>

				<!-- Profile Card -->
				<div class="bg-white rounded-[16px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] mb-[20px]">
					<!-- User header -->
					<div class="flex items-center gap-[16px] mb-[24px] pb-[24px] border-b border-[#F0F0F0]">
						<div class="w-[56px] h-[56px] rounded-full bg-[#095866] flex items-center justify-center text-white text-[1.25rem] font-bold shrink-0">
							{{ user?.name?.charAt(0)?.toUpperCase() }}{{ user?.surname?.charAt(0)?.toUpperCase() || '' }}
						</div>
						<div>
							<h2 class="text-[1.125rem] font-bold text-[#252B42]">{{ user?.name }} {{ user?.surname }}</h2>
							<span :class="['inline-block px-[10px] py-[3px] rounded-full text-[0.75rem] font-medium mt-[4px]', getRoleBadge(user?.role).class]">
								{{ getRoleBadge(user?.role).label }}
							</span>
						</div>
					</div>

					<!-- Info list -->
					<div class="space-y-[16px]">
						<div class="flex items-start gap-[12px]">
							<div class="w-[36px] h-[36px] rounded-[8px] bg-[#F8F9FB] flex items-center justify-center shrink-0">
								<Icon name="mdi:email-outline" class="text-[18px] text-[#737373]" />
							</div>
							<div>
								<p class="text-[0.8125rem] text-[#737373]">Email</p>
								<p class="text-[0.9375rem] font-medium text-[#252B42]">{{ user?.email }}</p>
							</div>
						</div>

						<div class="flex items-start gap-[12px]">
							<div class="w-[36px] h-[36px] rounded-[8px] bg-[#F8F9FB] flex items-center justify-center shrink-0">
								<Icon name="mdi:phone-outline" class="text-[18px] text-[#737373]" />
							</div>
							<div>
								<p class="text-[0.8125rem] text-[#737373]">Numero di telefono</p>
								<p class="text-[0.9375rem] font-medium text-[#252B42]">{{ getTelephoneNumber(user?.telephone_number) }}</p>
							</div>
						</div>

						<div class="flex items-start gap-[12px]">
							<div class="w-[36px] h-[36px] rounded-[8px] bg-[#F8F9FB] flex items-center justify-center shrink-0">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#737373]" fill="currentColor"><path d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25Z"/></svg>
							</div>
							<div>
								<p class="text-[0.8125rem] text-[#737373]">Tipo account</p>
								<p class="text-[0.9375rem] font-medium text-[#252B42]">{{ (user?.user_type || 'privato') === 'commerciante' ? 'Azienda' : 'Privato' }}</p>
							</div>
						</div>

						<div v-if="user?.company_name" class="flex items-start gap-[12px]">
							<div class="w-[36px] h-[36px] rounded-[8px] bg-[#F8F9FB] flex items-center justify-center shrink-0">
								<Icon name="mdi:domain" class="text-[18px] text-[#737373]" />
							</div>
							<div>
								<p class="text-[0.8125rem] text-[#737373]">Azienda</p>
								<p class="text-[0.9375rem] font-medium text-[#252B42]">{{ user?.company_name }}</p>
								<p v-if="user?.vat_number" class="text-[0.8125rem] text-[#737373]">P.IVA: {{ user?.vat_number }}</p>
							</div>
						</div>

						<div class="flex items-start gap-[12px]">
							<div class="w-[36px] h-[36px] rounded-[8px] bg-[#F8F9FB] flex items-center justify-center shrink-0">
								<Icon name="mdi:lock-outline" class="text-[18px] text-[#737373]" />
							</div>
							<div>
								<p class="text-[0.8125rem] text-[#737373]">Password</p>
								<p class="text-[0.9375rem] font-medium text-[#252B42]">************</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Logout button -->
				<button
					@click.prevent="handleLogout"
					class="w-full py-[14px] border border-[#E9EBEC] rounded-[10px] text-[0.9375rem] text-[#737373] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer font-medium inline-flex items-center justify-center gap-[8px]">
					<Icon name="mdi:logout" class="text-[18px]" />
					Esci dall'account
				</button>
			</template>

			<!-- ===== EDIT FORM ===== -->
			<template v-if="showEditForm">
				<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Modifica dati</h1>

				<div class="bg-white rounded-[16px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] max-w-[600px] mx-auto">
					<form @submit.prevent="updateInfo">
						<!-- Tipo account -->
						<h3 class="text-[1rem] font-bold text-[#252B42] mb-[12px]">Tipo account</h3>
						<div class="flex items-center gap-[12px] mb-[20px]">
							<label
								:class="[
									'flex-1 flex items-center justify-center gap-[6px] px-[16px] py-[12px] rounded-[10px] cursor-pointer border transition-all text-[0.9375rem] font-medium text-center',
									userInfo.user_type === 'privato'
										? 'bg-[#095866] text-white border-[#095866] shadow-sm'
										: 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866]',
								]">
								<input type="radio" value="privato" v-model="userInfo.user_type" class="sr-only" />
								Privato
							</label>
							<label
								:class="[
									'flex-1 flex items-center justify-center gap-[6px] px-[16px] py-[12px] rounded-[10px] cursor-pointer border transition-all text-[0.9375rem] font-medium text-center',
									userInfo.user_type === 'commerciante'
										? 'bg-[#095866] text-white border-[#095866] shadow-sm'
										: 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866]',
								]">
								<input type="radio" value="commerciante" v-model="userInfo.user_type" class="sr-only" />
								Azienda
							</label>
						</div>

						<!-- Personal data -->
						<h3 class="text-[1rem] font-bold text-[#252B42] mb-[16px]">Dati personali</h3>
						<div class="grid grid-cols-2 gap-[12px] mb-[16px]">
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Nome *</label>
								<input type="text" v-model="userInfo.name" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
							</div>
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Cognome</label>
								<input type="text" v-model="userInfo.surname" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
							</div>
						</div>
						<div class="mb-[16px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Email *</label>
							<input type="email" v-model="userInfo.email" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
						</div>
						<div class="mb-[16px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Telefono</label>
							<input type="text" v-model="userInfo.telephone_number" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
						</div>

						<!-- Business data -->
						<h3 class="text-[1rem] font-bold text-[#252B42] mb-[12px] mt-[24px] pt-[20px] border-t border-[#F0F0F0]">Dati aziendali (opzionale)</h3>
						<p class="text-[0.8125rem] text-[#737373] mb-[14px]">Compila solo se sei un commerciante o un'azienda.</p>
						<div class="grid grid-cols-2 gap-[12px] mb-[12px]">
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Ragione Sociale</label>
								<input type="text" v-model="userInfo.company_name" placeholder="Nome azienda" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
							</div>
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Partita IVA</label>
								<input type="text" v-model="userInfo.vat_number" placeholder="IT12345678901" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
							</div>
						</div>
						<div class="grid grid-cols-2 gap-[12px] mb-[12px]">
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Codice Fiscale</label>
								<input type="text" v-model="userInfo.fiscal_code" placeholder="RSSMRA80A01H501U" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
							</div>
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">PEC</label>
								<input type="email" v-model="userInfo.pec" placeholder="azienda@pec.it" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
							</div>
						</div>
						<div class="mb-[12px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Codice SDI</label>
							<input type="text" v-model="userInfo.sdi_code" placeholder="0000000" maxlength="7" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
						</div>

						<!-- Billing data -->
						<h3 class="text-[1rem] font-bold text-[#252B42] mb-[12px] mt-[24px] pt-[20px] border-t border-[#F0F0F0]">Dati di fatturazione</h3>

						<label class="flex items-center gap-[8px] cursor-pointer mb-[14px]">
							<input type="checkbox" v-model="billingSameAsShipping" class="w-[18px] h-[18px] accent-[#095866] cursor-pointer" />
							<span class="text-[0.8125rem] text-[#737373]">Uguale ai dati di spedizione</span>
						</label>

						<template v-if="!billingSameAsShipping">
							<div class="mb-[12px]">
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Intestatario fatturazione</label>
								<input type="text" v-model="userInfo.billing_name" placeholder="Nome o Ragione Sociale" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
							</div>
							<div class="mb-[12px]">
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Indirizzo fatturazione</label>
								<input type="text" v-model="userInfo.billing_address" placeholder="Via Roma 10" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
							</div>
							<div class="grid grid-cols-3 gap-[12px] mb-[12px]">
								<div>
									<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Città</label>
									<input type="text" v-model="userInfo.billing_city" placeholder="Roma" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
								</div>
								<div>
									<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">CAP</label>
									<input type="text" v-model="userInfo.billing_postal_code" placeholder="00100" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
								</div>
								<div>
									<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Provincia</label>
									<input type="text" v-model="userInfo.billing_province" placeholder="RM" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
								</div>
							</div>
						</template>

						<!-- Password -->
						<h3 class="text-[1rem] font-bold text-[#252B42] mb-[12px] mt-[24px] pt-[20px] border-t border-[#F0F0F0]">Cambia password</h3>
						<div class="grid grid-cols-2 gap-[12px] mb-[24px]">
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Nuova password</label>
								<input type="password" v-model="userInfo.password" placeholder="Lascia vuoto per mantenere" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
							</div>
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Conferma password</label>
								<input type="password" v-model="userInfo.password_confirmation" placeholder="Conferma" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
							</div>
						</div>

						<!-- Bottoni salva/annulla con loading state sul pulsante -->
						<div class="flex gap-[12px]">
							<button type="button" @click.prevent="showEditForm = false" :disabled="!!messageLoading" class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[10px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] font-semibold text-[0.9375rem] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
								<Icon name="mdi:close" class="text-[18px]" />
								Annulla
							</button>
							<button type="submit" :disabled="!!messageLoading" class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[10px] bg-[#095866] hover:bg-[#074a56] text-white font-semibold text-[0.9375rem] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
								<Icon name="mdi:content-save" class="text-[18px]" />
								{{ messageLoading ? 'Salvataggio...' : 'Salva modifiche' }}
							</button>
						</div>
					</form>
				</div>
			</template>
		</div>
	</section>
</template>
