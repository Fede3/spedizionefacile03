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
	email: user.value?.email || "",
	password: "",
	password_confirmation: "",
	telephone_number: user.value?.telephone_number || "",
});

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

				<div class="bg-white rounded-[16px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] max-w-[480px] mx-auto">
					<form @submit.prevent="updateInfo">
						<div class="mb-[20px]">
							<label for="name" class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Nome</label>
							<input
								type="text"
								v-model="userInfo.name"
								id="name"
								class="w-full px-[14px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.9375rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors"
								placeholder="Il tuo nome"
								required />
						</div>

						<div class="mb-[20px]">
							<label for="email" class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Email</label>
							<input
								type="email"
								v-model="userInfo.email"
								id="email"
								class="w-full px-[14px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.9375rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors"
								placeholder="La tua email"
								required />
						</div>

						<div class="mb-[20px]">
							<label for="telephone_number" class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Numero di telefono</label>
							<input
								type="text"
								v-model="userInfo.telephone_number"
								id="telephone_number"
								class="w-full px-[14px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.9375rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors"
								placeholder="Inserisci il numero di telefono" />
						</div>

						<div class="mb-[20px]">
							<label for="password" class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Nuova password</label>
							<input
								type="password"
								v-model="userInfo.password"
								id="password"
								class="w-full px-[14px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.9375rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors"
								placeholder="Lascia vuoto per mantenere la stessa" />
						</div>

						<div class="mb-[24px]">
							<label for="password_confirmation" class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Conferma password</label>
							<input
								type="password"
								v-model="userInfo.password_confirmation"
								id="password_confirmation"
								class="w-full px-[14px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.9375rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors"
								placeholder="Conferma la nuova password" />
						</div>

						<p v-if="messageLoading" class="text-center text-[0.875rem] text-[#095866] font-medium mb-[16px]">
							{{ messageLoading }}
						</p>

						<div class="flex gap-[12px]">
							<button
								type="button"
								@click.prevent="showEditForm = false"
								class="flex-1 py-[14px] rounded-[10px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
								Annulla
							</button>
							<button
								type="submit"
								class="flex-1 py-[14px] rounded-[10px] bg-[#095866] hover:bg-[#0a7a8c] text-white font-semibold text-[0.9375rem] transition-colors cursor-pointer">
								Salva modifiche
							</button>
						</div>
					</form>
				</div>
			</template>
		</div>
	</section>
</template>
