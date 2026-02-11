<script setup>
definePageMeta({
	middleware: ["sanctum:guest", "email-verification"],
});

const route = useRoute();

const router = useRouter();

const statusMessage = ref(null);

const status = route.query.status;

if (status === "verified") {
	statusMessage.value = "Email verificata con successo!";
} else if (status === "invalid_signature") {
	statusMessage.value = "Link non valido.";
} else if (status === "already_verified") {
	statusMessage.value = "Email già verificata.";
} else {
	router.push("/");
}
</script>

<template>
	<section class="h-[400px] py-[80px]">
		<div class="my-container flex justify-center items-center h-full" v-if="statusMessage">
			<p>{{ statusMessage }}</p>
		</div>
	</section>
</template>
