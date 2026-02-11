<script setup>
const route = useRoute();
const router = useRouter();

const data = ref({
	resetToken: "",
	email: "",
	password: "",
	password_confirmation: "",
});

const messageError = ref(null);
const messageSuccess = ref(null);
const isLoading = ref(false);

const updatePassword = async () => {
	messageError.value = null;
	messageSuccess.value = null;
	data.value.resetToken = route.query.token || "";

	if (!data.value.resetToken) {
		messageError.value = "Token di recupero mancante o non valido.";
		return;
	}

	isLoading.value = true;

	try {
		const response = await $fetch(`${useRuntimeConfig().public.apiBase}/update-password`, {
			method: "POST",
			headers: {
				"ngrok-skip-browser-warning": "skip-browser-warning",
			},
			body: data.value,
		});

		messageSuccess.value = response.message;
		setTimeout(() => {
			router.push('/autenticazione');
		}, 1200);
	} catch (error) {
		messageError.value = error?.response?._data?.message || "Errore durante la modifica della password.";
	}
	finally {
		isLoading.value = false;
	}
};

definePageMeta({
	middleware: ["sanctum:guest", "update-password"],
});
</script>

<template>
	<section class="min-h-[500px] py-10">
		<div class="my-container flex justify-center items-center h-full">
			<form @submit.prevent="updatePassword" class="w-full max-w-[520px] bg-white p-6 rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,.08)]">
				<h1 class="text-[1.25rem] font-bold text-[#252B42] mb-2">Imposta nuova password</h1>
				<p class="text-[#6b7280] mb-4">Inserisci la tua email e la nuova password.</p>

				<label for="email" class="block font-semibold text-[#095866]">Email</label>
				<input id="email" v-model="data.email" type="email" class="block w-full mt-1 mb-3 bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px]" required />

				<label for="password" class="block font-semibold text-[#095866]">Nuova password</label>
				<input id="password" v-model="data.password" type="password" class="block w-full mt-1 mb-3 bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px]" required />

				<label for="password_confirmation" class="block font-semibold text-[#095866]">Conferma nuova password</label>
				<input id="password_confirmation" v-model="data.password_confirmation" type="password" class="block w-full mt-1 mb-2 bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px]" required />

				<button type="submit" :disabled="isLoading" class="bg-[#E44203] text-white py-[12px] mt-3 cursor-pointer w-full rounded-[8px] disabled:opacity-70">
					{{ isLoading ? 'Salvataggio...' : 'Aggiorna password' }}
				</button>

				<p v-if="messageSuccess" class="text-green-600 mt-3">{{ messageSuccess }}</p>
				<p v-if="messageError" class="text-red-600 mt-3">{{ messageError }}</p>
			</form>
		</div>
	</section>
</template>
