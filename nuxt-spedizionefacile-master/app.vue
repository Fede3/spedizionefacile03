<!--
	FILE PRINCIPALE DELL'APPLICAZIONE (app.vue)

	Questo e' il punto di ingresso di TUTTO il sito.
	E' il primo file che viene caricato quando un utente apre il sito.

	Cosa fa:
	1. Carica la sessione dal server (i dati temporanei del preventivo in corso)
	2. Se nella sessione ci sono dati salvati (pacchi e dettagli spedizione),
	   li ripristina nello store (la memoria condivisa del sito), cosi' l'utente
	   non perde i dati se aggiorna la pagina o naviga tra le pagine
	3. Mostra la struttura base del sito:
	   - UApp: il contenitore principale della libreria Nuxt UI
	   - NuxtLayout: il layout (cornice con header e footer)
	   - NuxtPage: la pagina corrente che cambia a seconda dell'indirizzo

	Il "watch" serve a gestire il caso in cui la sessione arriva dal server
	dopo che la pagina e' gia' stata caricata (caricamento asincrono):
	in quel caso ripristina i dati appena diventano disponibili.
-->
<script setup>
const { session } = useSession();
const userStore = useUserStore();
const route = useRoute();

const restoreSession = (data) => {
	if (data?.packages && data?.shipment_details) {
		userStore.shipmentDetails = { ...data.shipment_details };
		userStore.packages = data.packages;
	}
};

// Ripristina subito i dati se la sessione e' gia' disponibile
restoreSession(session.value?.data);

// Ripristina anche quando la sessione arriva dal server in modo asincrono
// (usa "once: true" per eseguire solo la prima volta, non ad ogni cambio)
watch(() => session.value?.data, (data) => {
	if (data && userStore.packages.length === 0) {
		restoreSession(data);
	}
}, { once: true });

// Failsafe: evita lock scroll globale se una route preview lascia classi/stili sul body.
if (process.client) {
	const unlockGlobalScroll = () => {
		const isPreviewRoute = route.path.startsWith('/preview/home-hero');
		if (isPreviewRoute) return;
		document.documentElement.classList.remove('hero-preview-body');
		document.body.classList.remove('hero-preview-body');
		document.documentElement.style.overflow = '';
		document.documentElement.style.overflowY = '';
		document.body.style.overflow = '';
		document.body.style.overflowY = '';
	};

	onMounted(unlockGlobalScroll);
	watch(() => route.path, unlockGlobalScroll);
}
</script>

<template>
	<UApp>
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
	</UApp>
</template>
