<script setup>
import { FetchError } from "ofetch";

const { login, refreshIdentity } = useSanctumAuth();

const credentials = ref({
	email: "vale@example.com",
	password: "C1a!0.Gg",
	remember: false,
});

const messageError = ref(null);

const limitMessageError = ref(null);

const messageLoading = ref(null);

const handleLogin = async () => {
	messageError.value = null;
	messageLoading.value = "Login in corso...";

	try {
		await login(credentials.value, {
			/* headers: {
				"ngrok-skip-browser-warning": "skip-browser-warning",
			}, */
		});
	} catch (error) {
		if (error instanceof FetchError && error.response?.status === 422) {
			messageError.value = error.response?._data.errors;
		}

		if (error.response?.status === 401 || error.response?.status === 429) {
			messageError.value = error.response._data;
		}

		/* if (error.response?.status === 429) {
			limitMessageError.value = error.response._data;
		} */
	} finally {
		if (!messageError.value) {
			credentials.value.email = null;
			credentials.value.password = null;
			credentials.value.remember = false;
		}

		messageLoading.value = null;
	}
};

definePageMeta({
	middleware: ["sanctum:guest"],
});
</script>

<template>
	<section class="h-[400px]">
		<div class="my-container flex justify-center flex-wrap items-center h-[400px]">
			<form @submit.prevent="handleLogin" class="mx-auto">
				<label for="email">Email:</label>
				<input type="email" id="email" v-model="credentials.email" required />
				<label for="password">Password:</label>
				<input type="password" id="password" v-model="credentials.password" required />
				<p v-if="messageError?.email" class="text-red-500">
					{{ messageError.email[0] }}
				</p>
				<button type="submit" class="bg-[#E44203] text-white p-[10px] cursor-pointer mr-[20px]">Login</button>

				<NuxtLink to="/recupera-password">Recupera password</NuxtLink>

				<div class="flex items-center gap-x-[9px] mt-[10px]">
					<input type="checkbox" id="checkbox" v-model="credentials.remember" />
					<label for="checkbox">Mantieni l'accesso</label>
				</div>

				<p v-if="messageLoading" class="w-full">
					{{ messageLoading }}
				</p>
			</form>

			<p v-if="messageError?.message" class="text-red-500 w-full text-center">
				{{ messageError?.message }}
			</p>

			<!-- <p>
                {{ limitMessageError }}
            </p> -->
		</div>
	</section>
</template>

<style scoped>
select,
input {
	display: block;
	margin: 10px 0;
	background-color: rgba(0, 0, 0, 0.1);
	color: rgba(0, 0, 0, 0.4);
}
</style>
