<script setup>
const navLinks = [
	{ page: "/servizi", text: "Servizi" },
	{ page: "/", text: "Preventivo Rapido" },
	{ page: "/", text: "Guide" },
	{ page: "/checkout", text: "Checkout" },
	{ page: "/contatti", text: "Contatti" },
];

const { isAuthenticated, user } = useSanctumAuth();
const { cart, status } = useCart();

</script>

<template>
	<div class="relative w-full">
		<div class="h-[4px] w-full bg-[#E44203] rounded-full mb-2"></div>
		<div class="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 desktop:h-[65px] tablet:h-[50px] h-[38px] relative z-2">
			<NuxtLink to="/" class="flex items-center h-full outline-none">
				<Logo :is-navbar="true" />
			</NuxtLink>

			<nav class="desktop-xl:text-[1.25rem] desktop:text-[1rem] hidden mid-desktop-navbar:flex justify-center">
				<ul class="flex items-center justify-center desktop-xl:gap-x-[40px] mid-desktop-navbar:gap-x-[22px] text-[rgba(64,64,64,.67)] tracking-[-0.48px]">
					<li v-for="(nav, navIndex) in navLinks" :key="navIndex">
						<NuxtLink :to="nav.page">
							{{ nav.text }}
						</NuxtLink>
					</li>
				</ul>
			</nav>

			<nav class="mid-desktop-navbar:hidden justify-self-end">
				<UDropdownMenu :items="navLinks" :modal="false">
					<button type="button" class="cursor-pointer">
						<NuxtImg src="/img/hamburger.png" alt="Menù Hamburger" width="24" height="16" />
					</button>
					<template #item="{ item }">
						<NuxtLink :to="item.page" class="block w-full text-left">{{ item.text }}</NuxtLink>
					</template>
				</UDropdownMenu>
			</nav>

			<NuxtLink
				:to="isAuthenticated ? '/account' : '/autenticazione'"
				class="hidden mid-desktop-navbar:inline-block bg-[#E44203] desktop-xl:w-[143px] mid-desktop-navbar:w-[91px] mid-desktop-navbar:h-[41px] desktop-xl:h-full mid-desktop-navbar:leading-[41px] desktop-xl:leading-[65px] text-center text-white rounded-[50px] font-semibold desktop-xl:text-[1.25rem] desktop:text-[0.875rem] tracking-[-0.48px]">
				<span v-if="isAuthenticated">Ciao {{ user?.name }}</span>
				<span v-else>Accedi!</span>
			</NuxtLink>

			<NuxtLink to="/carrello" class="inline-block bg-[#E44203] px-[30px] h-[48px] leading-[48px] text-center text-white rounded-[24px] font-semibold">
				<Icon name="mdi:cart-outline" />
				<span v-if="status === 'success'">{{ cart?.data?.length || 0 }}</span>
				<span v-if="status === 'pending'">...</span>
			</NuxtLink>
		</div>
		<div class="h-[4px] w-full bg-[#095866] rounded-full mt-2"></div>
	</div>
</template>
