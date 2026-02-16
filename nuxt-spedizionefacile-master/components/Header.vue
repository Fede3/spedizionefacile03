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
const route = useRoute();
</script>

<template>
	<!--  :class="{ ' h-[722px]': route.path === '/' }" da inserire nell'header -->

	<!--  -->
	<header
		class="relative bg-[#E3E3E3] z-40"
		:class="{
			'desktop:h-[680px] desktop-xl:h-[722px] tablet:h-[540px] h-[480px] overflow-hidden after:absolute after:content-[\'\'] after:h-[80px] after:w-full after:bg-[#eeeeee] after:z-1 after:bottom-0 desktop:after:hidden':
				route.path === '/',
			'desktop:h-[359px] desktop-xl:h-[457px] h-[308px] overflow-hidden': route.path === '/servizi',
			'desktop:h-[722px] desktop-xl:h-[783px] h-[432px] overflow-hidden': route.path === '/contatti',
			'desktop:h-[762px] desktop-xl:h-[913px] h-[464px] tablet:h-[500px] overflow-hidden': route.path === '/chi-siamo',
			'desktop:h-[318px] desktop-xl:h-[424px] h-[230px] overflow-hidden': route.path === '/faq',
			'desktop:h-[359px] desktop-xl:h-[392px] h-[214px] overflow-hidden': route.path === '/account',
			'desktop:h-[529px] desktop-xl:h-[772px] h-[397px] tablet:h-[460px] overflow-hidden': route.path.includes('pagamento-alla-consegna'),
			'desktop:h-[359px] desktop-xl:h-[457px] h-[308px] overflow-hidden': route.path.startsWith('/guide'),
			'h-auto pb-[12px]': route.path === '/preventivo',
		}">
		<!--  before:content-[''] before:absolute before:left-[-80px] before:top-0 before:w-[60%] before:h-full before:bg-[url('/img/header-bg.svg')] before:bg-no-repeat before:z-[1] da inserire sul div qui sotto -->
		<div class="desktop-xl:pt-[40px] desktop:pt-[25px] mobile:pt-[20px] my-container relative h-full">
			<!--  desktop:px-[35px] desktop-xl:px-0 -->
			<Navbar />

			<ContenutoHeader />
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
