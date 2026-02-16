<!--
  PAGINA: Verifica Email (verifica-email.vue)
  Pagina di atterraggio dopo il click sul link di verifica email.
  Legge il parametro ?status dalla URL e mostra il messaggio corrispondente:
  - "verified": email verificata con successo
  - "invalid_signature": link non valido
  - "already_verified": email gia' verificata
  Se nessuno status e' presente, reindirizza alla homepage.
-->
<script setup>
// Solo utenti non autenticati, con middleware di verifica email
definePageMeta({
	middleware: ["sanctum:guest", "email-verification"],
});

const route = useRoute();
const router = useRouter();
const statusMessage = ref(null);

// Legge lo stato della verifica dalla query string
const status = route.query.status;

if (status === "verified") {
	statusMessage.value = "Email verificata con successo!";
} else if (status === "invalid_signature") {
	statusMessage.value = "Link non valido.";
} else if (status === "already_verified") {
	statusMessage.value = "Email già verificata.";
} else {
	// Nessuno stato valido: torna alla homepage
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
