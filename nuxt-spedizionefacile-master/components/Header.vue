<!--
	COMPONENTE: Header (Header.vue)
	SCOPO: Intestazione del sito — contiene Navbar e ContenutoHeader.

	DOVE SI USA: layouts/default.vue (layout principale, presente in tutte le pagine)
	PROPS: nessuna
	EMITS: nessuno

	DATI IN INGRESSO: route.path (per adattare altezza e stile)
	DATI IN USCITA: nessuno (solo visualizzazione)

	VINCOLI: l'altezza dell'header e' diversa per ogni pagina — se aggiungi una nuova
	         pagina con header personalizzato, aggiungi la regola qui e in ContenutoHeader.vue
	PUNTI DI MODIFICA SICURI: classi CSS condizionali per altezza/overflow
	COLLEGAMENTI: components/Navbar.vue, components/ContenutoHeader.vue

	ALTEZZE PER PAGINA:
	- Homepage: grande (480px mobile → 722px desktop-xl) con overflow hidden
	- Servizi: medio (308px → 457px)
	- Contatti: grande (432px → 783px)
	- Chi siamo: grande (464px → 913px)
	- FAQ: medio (230px → 424px)
	- Account: piccolo (214px → 392px)
	- Preventivo: auto (si adatta al contenuto)
-->
<script setup>
const { isAccountRoute, isAuthMinimalShellRoute, isAuthPageRoute, isHomepageLikeRoute, isPreventivoRoute, isStandaloneMarketingHeroRoute } =
	useShellRouteState();

const headerClass = computed(() => {
	if (isAuthMinimalShellRoute.value) {
		return 'bg-[#E3E3E3] h-auto pb-[12px]';
	}

	if (isHomepageLikeRoute.value) {
		return "h-auto min-h-[380px] tablet:min-h-[480px] desktop:min-h-[480px] desktop-xl:min-h-[520px] overflow-visible desktop:overflow-hidden after:absolute after:content-[''] after:h-[80px] after:w-full after:bg-[#eeeeee] after:z-1 after:bottom-0 desktop:after:hidden";
	}

	if (isStandaloneMarketingHeroRoute.value) {
		return 'bg-[#E3E3E3] h-auto pb-[12px]';
	}

	if (isAccountRoute.value) {
		return 'bg-[linear-gradient(180deg,#eef5f6_0%,#edf3f4_100%)] h-auto pb-[16px] overflow-visible';
	}

	if (isPreventivoRoute.value) {
		return 'bg-[#E3E3E3] h-auto pb-[12px]';
	}

	return 'bg-[#E3E3E3] h-auto pb-[12px]';
});

const headerInnerClass = computed(() => {
	if (isAuthMinimalShellRoute.value) {
		return 'desktop-xl:pt-[18px] desktop:pt-[16px] tablet:pt-[14px] mobile:pt-[12px] pb-0';
	}

	if (isAccountRoute.value) {
		return 'desktop-xl:pt-[18px] desktop:pt-[16px] mobile:pt-[14px] pb-0';
	}

	return 'desktop-xl:pt-[40px] desktop:pt-[24px] mobile:pt-[20px]';
});
</script>

<template>
	<header class="relative z-40" :class="headerClass">
		<div class="my-container relative h-full" :class="headerInnerClass">
			<Navbar />

			<ContenutoHeader v-if="isHomepageLikeRoute && !isAccountRoute && !isAuthPageRoute" />
		</div>
	</header>
</template>

<style scoped>
/* header::before {
	content: "";
	position: absolute;
	left: 0;
	top: 0;
	width: calc(100% - (1440px + 160px));
	height: 100%;
	background-image: url("/img/header-bg.svg");
	background-repeat: no-repeat;
	z-index: 1;
	transform: scaleX(-1);
} */

/* .my-container:first-child::before {
	content: "";
	position: absolute;
	left: 0;
	top: -40px;
	width: 55%;
	height: 100%;
	background-image: url("/img/header-bg.svg");
	background-repeat: no-repeat;
	z-index: 1;
} */

/* .price::before {
	content: "";
	position: absolute;
	left: 0;
	top: 0;
	width: 796px;
	height: 452px;
	background-image: var(--admin-image);
	background-repeat: no-repeat;
	background-size: cover;
	z-index: -1;
	border-radius: 50px 50px 0 0;
} */

/* .home::after {
  @apply absolute right-[10%] bottom-0 w-[796px] h-[452px] rounded-t-[50px] z-10;
  content: "";
  background-image: var(--admin-image);
  background-repeat: no-repeat;
  background-size: cover;
} */
</style>
