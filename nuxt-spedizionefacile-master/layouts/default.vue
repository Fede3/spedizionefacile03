<!--
	LAYOUT PREDEFINITO (layouts/default.vue)

	Il "layout" e' la struttura base che avvolge tutte le pagine del sito.
	Funziona come una "cornice" che rimane uguale in ogni pagina,
	mentre il contenuto al centro cambia.

	Questo layout predefinito contiene:
	- Header (intestazione) in alto: con la barra di navigazione e il logo
	- Contenuto della pagina al centro: cambia a seconda della pagina visitata
	  (viene inserito automaticamente al posto di <slot />)
	- Footer (piede di pagina) in basso: con i link e i social

	Tutte le pagine del sito usano questo layout, a meno che non ne specifichino
	uno diverso. Cosi' l'header e il footer appaiono sempre uguali ovunque.
-->
<script setup>
const { isAuthenticated } = useSanctumAuth();

const showScrollTop = ref(false);

const scrollToTop = () => {
	window.scrollTo({ top: 0, behavior: 'smooth' });
};

onMounted(() => {
	window.addEventListener('scroll', () => {
		showScrollTop.value = window.scrollY > 300;
	});
});
</script>

<template>
	<div class="w-full min-h-screen flex flex-col overflow-x-clip">
		<Header />

		<main class="flex-1 w-full max-w-full mx-auto">
			<slot />
		</main>

		<Footer />

		<!-- Bottone torna su fisso in basso a sinistra -->
		<button
			v-if="showScrollTop"
			@click="scrollToTop"
			class="fixed bottom-[24px] left-[16px] tablet:bottom-[20px] tablet:left-[20px] z-[999] w-[48px] h-[48px] tablet:w-[44px] tablet:h-[44px] rounded-full bg-[#095866] text-white flex items-center justify-center shadow-lg opacity-40 hover:opacity-100 transition-all duration-300 hover:scale-110 cursor-pointer"
			title="Torna su">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[22px] h-[22px]" fill="currentColor"><path d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z"/></svg>
		</button>

		<!-- Bottone aiuto fisso in basso a destra (solo utenti loggati) -->
		<NuxtLink
			v-if="isAuthenticated"
			to="/account/assistenza"
			class="fixed bottom-[24px] right-[16px] tablet:bottom-[20px] tablet:right-[20px] z-[999] w-[48px] h-[48px] tablet:w-[44px] tablet:h-[44px] rounded-full bg-[#095866] text-white flex items-center justify-center shadow-lg opacity-40 hover:opacity-100 transition-all duration-300 hover:scale-110"
			title="Assistenza">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[22px] h-[22px]" fill="currentColor"><path d="M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z"/></svg>
		</NuxtLink>
	</div>
</template>
