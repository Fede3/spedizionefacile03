<script setup>
const resetPassword = ref({
	email: "vale@example.com",
});

const messageError = ref(null);

const messageSuccess = ref(null);

const sendEmailResetPassword = async () => {
	try {
		const response = await $fetch(`${useRuntimeConfig().public.apiBase}/forgot-password`, {
			method: "POST",
			headers: {
				"ngrok-skip-browser-warning": "skip-browser-warning",
			},
			body: resetPassword.value,
		});

		/* console.log(response); */

		messageSuccess.value = response.message;
	} catch (error) {
		messageError.value = error.response._data.message;
	}
};

definePageMeta({
	middleware: ["sanctum:guest"],
});
</script>

<template>
	<section class="h-[400px]">
		<div class="my-container flex justify-center items-center h-full">
			<form @submit.prevent="sendEmailResetPassword" class="bg-white p-[20px] rounded-[8px] shadow-[0_2px_2px_#E8E8E8] text-[#095866]">
				<label for="email">Email</label>
				<input type="email" id="email" v-model="resetPassword.email" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" required />
				<button type="submit" class="cursor-pointer text-center text-white bg-[#005961] mx-auto py-[10px] block w-full mt-[20px] rounded-[5px]">Recupera password</button>

				<p v-if="messageSuccess" class="text-green-500">
					{{ messageSuccess }}
				</p>

				<p v-if="messageError" class="text-red-500">
					{{ messageError }}
				</p>
			</form>
		</div>
	</section>
</template>
