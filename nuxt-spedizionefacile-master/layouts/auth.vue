<script setup>
useHead({
	bodyAttrs: {
		class: 'auth-layout-body',
	},
});
</script>

<template>
	<div class="min-h-screen bg-[#F4F6F8]">
		<header class="border-b border-[var(--color-brand-border)] bg-white">
			<div class="my-container flex items-center py-[14px] tablet:py-[18px]">
				<NuxtLink to="/" class="inline-flex items-center">
					<Logo :is-navbar="true" />
				</NuxtLink>
			</div>
		</header>

		<main class="min-h-[calc(100vh-88px)]">
			<slot />
		</main>
	</div>
</template>
