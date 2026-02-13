<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const { refreshIdentity, user, logout } = useSanctumAuth();

const messageError = ref(null);
const messageSuccess = ref(null);
const messageLoading = ref(null);
const showEditForm = ref(false);

const userInfo = ref({
	name: user.value?.name || "",
	surname: user.value?.surname || "",
	email: user.value?.email || "",
	password: "",
	password_confirmation: "",
	telephone_number: user.value?.telephone_number || "",
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

// "same as shipping" checkbox
const billingSameAsShipping = ref(false);

const sanctum = useSanctumClient();

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

const getTelephoneNumber = (telephone_number) => {
	if (!telephone_number || telephone_number === "0") {
		return "Non ancora aggiunto";
	}
	return telephone_number;
};

const getRoleBadge = (role) => {
	if (role === "Partner Pro") return { label: "Partner Pro", class: "bg-[#095866]/10 text-[#095866]" };
	if (role === "Admin") return { label: "Admin", class: "bg-purple-50 text-purple-700" };
	return { label: "Cliente", class: "bg-blue-50 text-blue-700" };
};

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
						class="px-[20px] py-[10px] bg-[#095866] hover:bg-[#0a7a8c] text-white rounded-[10px] text-[0.875rem] font-semibold transition-colors cursor-pointer">
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
					class="w-full py-[14px] border border-[#E9EBEC] rounded-[10px] text-[0.9375rem] text-[#737373] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer font-medium">
					Esci dall'account
				</button>
			</template>

			<!-- ===== EDIT FORM ===== -->
			<template v-if="showEditForm">
				<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Modifica dati</h1>

				<div class="bg-white rounded-[16px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] max-w-[600px] mx-auto">
					<form @submit.prevent="updateInfo">
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

						<p v-if="messageLoading" class="text-center text-[0.875rem] text-[#095866] font-medium mb-[16px]">
							{{ messageLoading }}
						</p>

						<div class="flex gap-[12px]">
							<button type="button" @click.prevent="showEditForm = false" class="flex-1 py-[14px] rounded-[10px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
								Annulla
							</button>
							<button type="submit" class="flex-1 py-[14px] rounded-[10px] bg-[#095866] hover:bg-[#0a7a8c] text-white font-semibold text-[0.9375rem] transition-colors cursor-pointer">
								Salva modifiche
							</button>
						</div>
					</form>
				</div>
			</template>
		</div>
	</section>
</template>
