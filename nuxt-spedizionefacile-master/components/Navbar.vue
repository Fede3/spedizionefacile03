<script setup>
const navLinks = [
	{ page: "/servizi", text: "Servizi" },
	{ page: "/", text: "Preventivo Rapido" },
	{ page: "/", text: "Guide" },
	/*  { page: "/", text: "Tariffe" }, */
	{ page: "/checkout", text: "Checkout" },
	{ page: "/contatti", text: "Contatti" },
];

const { isAuthenticated, user } = useSanctumAuth();

const { cart, status } = useCart();
</script>

<template>
	<div class="flex items-center justify-between desktop:h-[65px] tablet:h-[50px] relative z-2 h-[38px]">
		<div class="flex items-center justify-between h-full">
			<NuxtLink to="/" class="flex items-center h-full outline-none">
				<Logo :is-navbar="true" />
			</NuxtLink>
		</div>

		<nav class="desktop-xl:text-[1.25rem] desktop:text-[1rem] hidden mid-desktop-navbar:block">
			<ul class="flex items-center justify-between desktop-xl:gap-x-[48px] mid-desktop-navbar:gap-x-[30px] text-[rgba(64,64,64,.67)] tracking-[-0.48px]">
				<li v-for="(nav, navIndex) in navLinks" :key="navIndex">
					<NuxtLink :to="nav.page">
						{{ nav.text }}
					</NuxtLink>
				</li>
			</ul>
		</nav>

		<nav class="mid-desktop-navbar:hidden">
			<UDropdownMenu :items="navLinks" :modal="false">
				<!-- <UButton icon="i-lucide-menu" class="bg-transparent! text-[#222222] cursor-pointer" /> -->

				<button type="button" class="cursor-pointer">
					<NuxtImg src="/img/hamburger.png" alt="Menù Hamburger" width="24" height="16" />
					<!-- <Icon name="pajamas:hamburger" class="text-[25px]" /> -->
				</button>

				<!-- Slot ufficiale 'item' -->
				<template #item="{ item, index }">
					<NuxtLink :to="item.page" class="block w-full text-left">
						{{ item.text }}
					</NuxtLink>
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
			<span v-if="status === 'success'">
				{{ cart?.data?.length || 0 }}
			</span>
			<span v-if="status === 'pending'">...</span>
		</NuxtLink>
	</div>
</template>
