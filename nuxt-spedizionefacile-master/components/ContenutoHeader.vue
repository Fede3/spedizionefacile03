<script setup>
const { data, status } = useAdminImage();
const route = useRoute();

const props = defineProps({
	title: String,
	description: String,
	button: String,
	image: String,
	path: String,
});
</script>

<template>
	<!-- Homepage -->
	<div class="mt-[54px] desktop-xl:mt-[56px] relative z-2" v-if="route.path === '/'">
		<div class="text-[#222222] tablet:max-w-[770px] tablet:mx-auto desktop:mx-0">
			<h1 class="leading-tight">
				<span class="block text-[2rem] tablet:text-[3rem] desktop:text-[4.8125rem] desktop-xl:text-[6.25rem] font-bold tracking-[-1px]">
					Spedisci in Italia
				</span>
				<span class="block text-[1.375rem] tablet:text-[2rem] desktop:text-[3rem] desktop-xl:text-[3.75rem] font-semibold tracking-[-0.5px] text-[#444] mt-[4px] desktop:mt-[8px]">
					a partire da
				</span>
				<span
					:style="
						data
							? { '--admin-image': `url(${data?.image_url})` }
							: { '--admin-image': `url(/img/homepage/trasporti-img.png)` }
					"
					class="admin-pill mt-[12px] desktop:mt-[16px]">
					6,88 €
				</span>
			</h1>
			<p class="text-[1.25rem] tablet:text-[1.5rem] desktop:text-[2rem] desktop-xl:text-[2.5rem] tracking-[-0.4px] font-extrabold mt-[16px] desktop:mt-[24px]">IVA e ritiro incluso</p>
		</div>
	</div>

	<!-- Servizi -->
	<div v-if="route.path === '/servizi'" class="relative z-2 flex flex-col items-center justify-center desktop:h-[calc(100%-65px)] tablet:h-[calc(100%-50px)] h-[calc(100%-38px)]">
		<h1 class="text-[#E44203] text-center font-medium tracking-[1.8px] desktop-xl:text-[1.25rem] text-[0.875rem] tracking desktop:text-[1.125rem]">I nostri servizi</h1>

		<p class="text-[2rem] desktop-xl:text-[5.5rem] leading-[120%] tracking-[-2.2112px] font-medium text-[#222222] text-center desktop:mb-[32px] mb-[24px] mt-[12px] desktop:text-[4rem]">
			Le nostre guide
		</p>

		<a
			href="#servizi"
			class="desktop:w-[146px] w-[123px] desktop:h-[60px] h-[48px] rounded-[35px] bg-[#E44203] leading-[48px] desktop:leading-[60px] font-semibold text-center text-white tracking-[-0.384px] mx-auto text-[0.875rem] desktop:text-[1rem] block">
			<span class="after:bg-[url('/img/arrow-down.svg')] after:bg-no-repeat after:inline-block after:size-[16px] after:ml-[11px] after:rotate-90 after:align-[-1px]">Scendi</span>
			<!-- <NuxtImg src="/img/arrow-down.svg" aria-hidden="true" width="16" height="16" alt="" class="size-[16px] rotate-90" /> -->
		</a>
	</div>

	<!-- Servizi - pagamento alla consegna -->
	<div
		class="relative z-2 flex flex-col items-center justify-between h-[calc(100%-38px)] desktop:h-[calc(100%-65px)] tablet:h-[calc(100%-50px)] after:content-[''] desktop-xl:after:w-[1280px] after:w-full after:h-[130px] mid-desktop:after:h-[220px] desktop:after:w-full desktop:after:h-[200px] desktop-xl:after:h-[320px] after:bg-green-500 desktop:after:rounded-t-[48px] after:rounded-t-[24px] tablet:after:h-[200px]"
		v-if="route.path.includes('pagamento-alla-consegna')">
		<div class="mt-[49px] mid-desktop:mt-[20px] desktop:mt-[50px] desktop-xl:mt-[73px] w-full">
			<p class="text-[#E44203] text-left font-medium tracking-[1.8px] desktop-xl:text-[1.25rem] text-[0.875rem] tracking desktop:text-[1.125rem]">Dettagli servizio</p>

			<h1
				class="text-[1.5rem] desktop:text-[3rem] desktop-xl:text-[5.5rem] leading-[110%] tracking-[-0.576px] desktop:tracking-[-2.2112px] font-medium text-[#222222] text-left mt-[12px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[200px] desktop:max-w-full">
				Pagamento alla consegna
			</h1>

			<a
				href="#pagamento-alla-consegna"
				class="desktop:w-[146px] w-[123px] desktop:h-[60px] h-[48px] rounded-[35px] bg-[#E44203] leading-[48px] desktop:leading-[60px] font-semibold text-center text-white tracking-[-0.384px] text-[0.875rem] desktop:text-[1rem] block mt-[15px] desktop-xl:mt-[30px]">
				<span class="after:bg-[url('/img/arrow-down.svg')] after:bg-no-repeat after:inline-block after:size-[16px] after:ml-[11px] after:rotate-90 after:align-[-1px]">Scendi</span>
			</a>
		</div>
	</div>

	<!-- Contatti -->
	<div
		class="relative z-2 flex flex-col items-center justify-between h-[calc(100%-38px)] desktop:h-[calc(100%-65px)] tablet:h-[calc(100%-50px)] after:content-[''] desktop-xl:after:w-[1280px] after:w-full after:h-[175px] mid-desktop:after:h-[220px] desktop:after:w-full desktop:after:h-[300px] desktop-xl:after:h-[290px] after:bg-green-500 desktop:after:rounded-t-[33px] after:rounded-t-[20px]"
		v-if="route.path === '/contatti'">
		<div class="mt-[49px] mid-desktop:mt-[20px] desktop:mt-[86px]">
			<h1 class="text-[#E44203] text-center font-medium tracking-[1.8px] desktop-xl:text-[1.25rem] text-[0.875rem] tracking desktop:text-[1.125rem]">Contattaci</h1>

			<p
				class="text-[2rem] desktop-xl:text-[5.5rem] leading-[110%] tracking-[-2.2112px] font-medium text-[#222222] text-center mt-[12px] desktop:text-[4rem] max-w-[276px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] desktop:max-w-[726px]">
				Siamo qui per aiutarti con le tue spedizioni.
			</p>
		</div>

		<!-- <div class="desktop-xl:w-[1280px] w-full h-[175px] mid-desktop:h-[220px] desktop:w-full desktop:h-[300px] desktop-xl:h-[290px] bg-green-500 rounded-t-[33px]"></div> -->
	</div>

	<!-- Chi siamo -->
	<div
		class="relative z-2 flex flex-col items-center justify-between h-[calc(100%-38px)] desktop:h-[calc(100%-65px)] tablet:h-[calc(100%-50px)] after:content-[''] desktop-xl:after:w-[1280px] after:w-full after:h-[165px] mid-desktop:after:h-[220px] desktop:after:w-full desktop:after:h-[300px] desktop-xl:after:h-[370px] after:bg-green-500 desktop:after:rounded-t-[33px] after:rounded-t-[20px] tablet:after:h-[200px]"
		v-if="route.path === '/chi-siamo'">
		<div class="mt-[49px] mid-desktop:mt-[20px] desktop:mt-[73px]">
			<h1 class="text-[#E44203] text-center font-medium tracking-[1.8px] desktop-xl:text-[1.25rem] text-[0.875rem] tracking desktop:text-[1.125rem]">Chi siamo</h1>

			<p
				class="text-[1.5rem] desktop:text-[3rem] desktop-xl:text-[5.5rem] leading-[110%] tracking-[-0.576px] desktop:tracking-[-2.2112px] font-medium text-[#222222] text-center mt-[12px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[336px] desktop:max-w-[620px]">
				Spedire un pacco online non è mai stato così facile
			</p>

			<a
				href="#chi-siamo"
				class="desktop:w-[146px] w-[123px] desktop:h-[60px] h-[48px] rounded-[35px] bg-[#E44203] leading-[48px] desktop:leading-[60px] font-semibold text-center text-white tracking-[-0.384px] mx-auto text-[0.875rem] desktop:text-[1rem] block mt-[24px]">
				<span class="after:bg-[url('/img/arrow-down.svg')] after:bg-no-repeat after:inline-block after:size-[16px] after:ml-[11px] after:rotate-90 after:align-[-1px]">Scendi</span>
			</a>
		</div>

		<!-- <div class="desktop-xl:w-[1280px] w-full h-[175px] mid-desktop:h-[220px] desktop:w-full desktop:h-[300px] desktop-xl:h-[360px] bg-green-500 rounded-t-[33px]"></div> -->
	</div>

	<!-- FAQ -->
	<div class="relative z-2 flex flex-col items-center justify-between h-[calc(100%-38px)] desktop:h-[calc(100%-65px)] tablet:h-[calc(100%-50px)]" v-if="route.path === '/faq'">
		<div class="mt-[49px] mid-desktop:mt-[20px] desktop:mt-[73px]">
			<h1 class="text-[#E44203] text-center font-medium tracking-[1.8px] desktop-xl:text-[1.25rem] text-[0.875rem] tracking desktop:text-[1.125rem]">FAQ</h1>

			<p
				class="text-[1.5rem] desktop:text-[3rem] desktop-xl:text-[5.5rem] leading-[110%] tracking-[-0.576px] desktop:tracking-[-2.2112px] font-medium text-[#222222] text-center mt-[12px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[336px] desktop:max-w-[620px]">
				Trova le tue risposte
			</p>
		</div>

		<!-- <div class="desktop-xl:w-[1280px] w-full h-[175px] mid-desktop:h-[220px] desktop:w-full desktop:h-[300px] desktop-xl:h-[360px] bg-green-500 rounded-t-[33px]"></div> -->
	</div>

	<!-- Account -->
	<div class="relative z-2 flex flex-col items-center justify-end h-[calc(100%-38px)] desktop:h-[calc(100%-65px)] tablet:h-[calc(100%-50px)]" v-if="route.path === '/account'">
		<h1
			class="text-[2rem] desktop:text-[3rem] desktop-xl:text-[4rem] leading-[110%] tracking-[-1.536px] desktop:tracking-[-2.2112px] font-medium text-[#222222] text-center mb-[36px] desktop:mb-[67px] desktop-xl:mb-[69px]">
			Il tuo account
		</h1>
	</div>
</template>

<style scoped>
/* Mobile base */
.admin-pill {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	font-weight: 800;
	color: #fff;
	background: #e44203;
	width: 160px;
	height: 64px;
	font-size: 2.25rem;
	letter-spacing: -1.1px;
	border-radius: 80px;
}

.admin-pill::after {
	content: "";
	position: absolute;
	background-image: var(--admin-image);
	background-repeat: no-repeat;
	background-position: right;
	background-size: cover;
	width: 320px;
	height: 190px;
	border-radius: 20px 20px 0 0;
	left: 150px;
	top: -10px;
	z-index: 20;
}

/* Tablet */
@media (min-width: 45rem) {
	.admin-pill {
		width: 220px;
		height: 84px;
		font-size: 3rem;
		margin-left: 0;
	}

	.admin-pill::after {
		width: 440px;
		height: 260px;
		left: 200px;
		top: -50px;
	}
}

/* Desktop */
@media (min-width: 64rem) {
	.admin-pill {
		width: 354px;
		height: 121px;
		font-size: 5rem;
	}

	.admin-pill::after {
		width: 720px;
		height: 430px;
		left: 320px;
		top: -90px;
		border-radius: 48px 48px 0 0;
	}
}

/* Desktop XL */
@media (min-width: 90rem) {
	.admin-pill {
		width: 458px;
		height: 155px;
		font-size: 6.875rem;
		border-radius: 110px;
	}

	.admin-pill::after {
		width: 796px;
		height: 426px;
		left: 420px;
		top: -50px;
		border-radius: 50px 50px 0 0;
	}
}
</style>
