<script setup>
const data = ref({
	resetToken: "",
	email: "vale@example.com",
	password: "C1a!0.Gg",
	password_confirmation: "C1a!0.Gg",
});

const route = useRoute();

const messageError = ref(null);

const updatePassword = async () => {
	data.value.resetToken = route.query.token;

	try {
		const response = await $fetch(`${useRuntimeConfig().public.apiBase}/update-password`, {
			method: "POST",
			headers: {
				"ngrok-skip-browser-warning": "skip-browser-warning",
			},
			body: data.value,
		});

		console.log(response);
	} catch (error) {
		messageError.value = error.response._data.message;
	}
};

definePageMeta({
	middleware: ["sanctum:guest", "update-password"],
});
</script>

<template>
	<section class="h-[400px]">
		<div class="my-container flex justify-center items-center h-full">
			<form @submit.prevent="updatePassword">
				<label for="email">Email:</label>
				<input type="email" id="email" v-model="data.email" required />
				<!-- <p v-if="messageError?.email" class="text-red-500">
					{{ messageError.email[0] }}
				</p> -->

				<label for="password">Password:</label>
				<input type="password" id="password" v-model="data.password" required />

				<label for="password_confirmation">Password confirmation:</label>
				<input type="password" id="password_confirmation" v-model="data.password_confirmation" required />
				<p v-if="messageError?.password" class="text-red-500">
					{{ messageError.password[0] }}
				</p>

				<button type="submit" class="bg-[#E44203] text-white p-[10px] cursor-pointer">Aggiorna password</button>

				<!-- <p v-if="messageSuccess">
					{{ messageSuccess }}
				</p> -->

				<p v-if="messageError" class="text-red-500">
					{{ messageError }}
				</p>
			</form>
		</div>
	</section>
</template>

<style>
input {
	display: block;
	margin: 10px 0;
	background-color: rgba(0, 0, 0, 0.1);
	color: rgba(0, 0, 0, 0.4);
}
</style>
