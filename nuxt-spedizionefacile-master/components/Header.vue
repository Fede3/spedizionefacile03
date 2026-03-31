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
const isHomepageLikeRoute = computed(() => route.path === '/' || route.path === '/preview/home-hero');
const authShellPaths = ['/autenticazione', '/login', '/registrazione', '/recupera-password', '/aggiorna-password'];
const isAuthShellRoute = computed(() => authShellPaths.some((path) => route.path.startsWith(path)));
const isAccountShellRoute = computed(() => route.path.startsWith('/account'));
const isPreventivoShellRoute = computed(() => route.path === '/preventivo' || route.path.startsWith('/preventivo/'));
</script>

<template>
	<!--  :class="{ ' h-[722px]': route.path === '/' }" da inserire nell'header -->

	<!--  -->
	<header
		class="relative z-40"
		:class="{
			'bg-white border-b border-[#E7EEF1] h-auto pb-0': isAuthShellRoute,
			'h-auto min-h-[380px] tablet:min-h-[480px] desktop:min-h-[480px] desktop-xl:min-h-[520px] overflow-visible desktop:overflow-hidden after:absolute after:content-[\'\'] after:h-[80px] after:w-full after:bg-[#eeeeee] after:z-1 after:bottom-0 desktop:after:hidden':
				isHomepageLikeRoute,
			'desktop:h-[256px] desktop-xl:h-[320px] h-[208px] tablet:h-[236px] overflow-hidden': route.path === '/servizi',
			'desktop:h-[198px] desktop-xl:h-[236px] h-[144px] tablet:h-[168px] overflow-hidden': route.path === '/contatti',
			'desktop:h-[314px] desktop-xl:h-[392px] h-[248px] tablet:h-[292px] overflow-hidden': route.path === '/chi-siamo',
			'desktop:h-[198px] desktop-xl:h-[248px] h-[164px] tablet:h-[192px] overflow-hidden': route.path === '/faq',
			'bg-white border-b border-[#E7EEF1] h-auto pb-0 overflow-visible': isAccountShellRoute,
			'desktop:h-[320px] desktop-xl:h-[376px] h-[216px] tablet:h-[252px] overflow-hidden': route.path.includes('pagamento-alla-consegna'),
			'desktop:h-[248px] desktop-xl:h-[308px] h-[204px] tablet:h-[228px] overflow-hidden': route.path.startsWith('/guide'),
			'bg-[#E3E3E3] h-auto pb-[12px]': isPreventivoShellRoute,
			'bg-[#E3E3E3]': !isAuthShellRoute && !isHomepageLikeRoute && route.path !== '/servizi' && route.path !== '/contatti' && route.path !== '/chi-siamo' && route.path !== '/faq' && !route.path.startsWith('/account') && !route.path.includes('pagamento-alla-consegna') && !route.path.startsWith('/guide') && !isPreventivoShellRoute,
		}">
		<!--  before:content-[''] before:absolute before:left-[-80px] before:top-0 before:w-[60%] before:h-full before:bg-[url('/img/header-bg.svg')] before:bg-no-repeat before:z-[1] da inserire sul div qui sotto -->
		<div
			class="my-container relative h-full"
			:class="
				isAuthShellRoute
					? 'desktop-xl:pt-[18px] desktop:pt-[16px] tablet:pt-[14px] mobile:pt-[12px]'
					: isAccountShellRoute
						? 'desktop-xl:pt-[10px] desktop:pt-[8px] mobile:pt-[8px] pb-0'
						: 'desktop-xl:pt-[40px] desktop:pt-[24px] mobile:pt-[20px]'
			">
			<!--  desktop:px-[35px] desktop-xl:px-0 -->
			<Navbar />

			<ContenutoHeader v-if="!isAccountShellRoute" />
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
