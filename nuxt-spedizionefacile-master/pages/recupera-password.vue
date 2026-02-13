<script setup>
const resetPassword = ref({
	email: "",
});

const messageError = ref(null);
const messageSuccess = ref(null);
const isLoading = ref(false);

const sendEmailResetPassword = async () => {
	messageError.value = null;
	messageSuccess.value = null;
	isLoading.value = true;

	try {
		const sanctum = useSanctumClient();
		const response = await sanctum("/api/forgot-password", {
			method: "POST",
			body: resetPassword.value,
		});

		messageSuccess.value = response.message;
	} catch (error) {
		messageError.value = error?.response?._data?.message || "Errore durante l'invio dell'email di recupero password.";
	} finally {
		isLoading.value = false;
	}
};

definePageMeta({
	middleware: ["sanctum:guest"],
});
</script>

<template>
	<section class="min-h-[420px]">
		<div class="my-container flex justify-center items-center h-full py-10">
			<form @submit.prevent="sendEmailResetPassword" class="w-full max-w-[460px] bg-white p-[24px] rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] text-[#095866]">
				<h1 class="text-[1.25rem] font-bold mb-2">Recupera password</h1>
				<p class="text-[0.95rem] text-[#556] mb-4">Inserisci la tua email per ricevere il link di reimpostazione.</p>
				<label for="email" class="font-semibold">Email</label>
				<input id="email" v-model="resetPassword.email" type="email" class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px] placeholder:text-gray-400 w-full mt-1" placeholder="nome@esempio.it" required />
				<button type="submit" :disabled="isLoading" class="cursor-pointer text-center text-white bg-[#005961] mx-auto py-[12px] block w-full mt-[20px] rounded-[8px] disabled:opacity-70">
					{{ isLoading ? 'Invio in corso...' : 'Invia link recupero password' }}
				</button>

				<p v-if="messageSuccess" class="text-green-600 mt-3">{{ messageSuccess }}</p>
				<p v-if="messageError" class="text-red-600 mt-3">{{ messageError }}</p>
			</form>
		</div>
	</section>
</template>
