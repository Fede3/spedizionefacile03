<!--
	COMPONENTE LOGO (Logo.vue)

	Questo componente mostra il logo di SpedizioneFacile.
	E' composto da un cerchio arancione con l'icona del pacco
	e la scritta "SpedizioneFacile" a fianco.

	Viene usato sia nella barra di navigazione (Navbar) che nel piede di pagina (Footer).
	Il parametro "isNavbar" indica se il logo e' usato nella navbar (true) o nel footer (false).
-->
<script setup>
const props = defineProps({
	isNavbar: Boolean,
});

const route = useRoute();
</script>

<template>
	<div
		class="bg-[#E44203] rounded-[50%] desktop:w-[62px] desktop:h-[62px] desktop-xl:w-[65px] desktop-xl:h-[65px] tablet:w-[50px] tablet:h-[50px] w-[38px] h-[38px] flex items-center justify-center shrink-0 relative after:content-[''] after:absolute after:right-[-12px] tablet:after:right-[-15px] desktop:after:right-[-19px] after:top-0 after:bg-[#333333] desktop:after:w-[4px] after:h-full after:w-[2.77px]">
		<!-- Ottimizzazione: logo above-the-fold, caricamento eager con priorita' alta -->
		<NuxtImg src="/img/logo-spedizionefacile.png" alt="Spedizione Facile" width="41" height="37" loading="eager" fetchpriority="high" decoding="async" class="w-[24px] h-[22px] desktop:w-[41px] desktop:h-[37px] tablet:w-[30px] tablet:h-[30px]" />
	</div>
	<!-- <div class="w-[4px] h-full bg-[#333333] ml-[15px] mr-[12px]" aria-hidden="true"></div> -->
	<span class="desktop:ml-[31px] ml-[18px] tablet:ml-[26px] text-[0.8125rem] desktop:text-[1.125rem] desktop-xl:text-[1.2rem] tablet:text-[1rem] font-semibold text-[#404040]">
		SpedizioneFacile
		<!-- :is="isNavbar && route.path === '/' ? 'h1' : isNavbar && route.path !== '/' ? 'h2' : 'span'" -->
	</span>
</template>
