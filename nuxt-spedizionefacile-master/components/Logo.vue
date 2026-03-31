<script setup>
const props = defineProps({
	isNavbar: Boolean,
});

const route = useRoute();
const isNavbarLogo = computed(() => Boolean(props.isNavbar));
const isAuthShellRoute = computed(() => (
	['/autenticazione', '/login', '/registrazione', '/recupera-password', '/aggiorna-password'].includes(route.path)
));
const showNavbarDivider = computed(() => isNavbarLogo.value && !isAuthShellRoute.value);
</script>

<template>
	<div
		class="logo-mark"
		:class="[
			isNavbarLogo ? 'logo-mark--navbar' : 'logo-mark--footer',
			showNavbarDivider ? 'logo-mark--with-divider' : ''
		]">
		<span class="logo-mark__glyph">SF</span>
	</div>
	<template v-if="isNavbarLogo">
		<span
			:class="[
				showNavbarDivider ? 'desktop:ml-[31px] ml-[14px] tablet:ml-[26px]' : 'desktop:ml-[14px] ml-[10px] tablet:ml-[12px]',
				'text-[#404040] font-semibold tracking-[-0.03em]',
			]"
		>
			<span class="inline max-w-[74px] truncate text-[0.75rem] sm:hidden">Spediamo</span>
			<span class="hidden text-[0.8125rem] tablet:text-[1rem] desktop:text-[1.125rem] desktop-xl:text-[1.2rem] sm:inline">SpediamoFacile</span>
		</span>
	</template>
	<span
		v-else
		:class="[
			showNavbarDivider ? 'desktop:ml-[31px] ml-[14px] tablet:ml-[26px]' : 'desktop:ml-[14px] ml-[10px] tablet:ml-[12px]',
			'text-[0.75rem] desktop:text-[1.125rem] desktop-xl:text-[1.2rem] tablet:text-[1rem] font-semibold tracking-[-0.03em] !text-white'
		]"
	>
		SpediamoFacile
	</span>
</template>

<style scoped>
.logo-mark {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	border-radius: 999px;
	background: #e44203;
	color: #ffffff;
}

.logo-mark--navbar {
	width: 38px;
	height: 38px;
}

.logo-mark--footer {
	width: 38px;
	height: 38px;
}

.logo-mark__glyph {
	font-size: 14px;
	line-height: 1;
	font-weight: 800;
	letter-spacing: -0.03em;
}

.logo-mark--with-divider::after {
	content: "";
	position: absolute;
	right: -12px;
	top: 0;
	width: 2px;
	height: 100%;
	background: #333333;
}

@media (min-width: 640px) {
	.logo-mark--navbar,
	.logo-mark--footer {
		width: 50px;
		height: 50px;
	}

	.logo-mark__glyph {
		font-size: 18px;
	}

	.logo-mark--with-divider::after {
		right: -15px;
	}
}

@media (min-width: 1024px) {
	.logo-mark--navbar,
	.logo-mark--footer {
		width: 62px;
		height: 62px;
	}

	.logo-mark__glyph {
		font-size: 22px;
	}

	.logo-mark--with-divider::after {
		right: -19px;
		width: 4px;
	}
}
</style>
