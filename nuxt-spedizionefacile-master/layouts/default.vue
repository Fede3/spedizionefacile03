<!--
	LAYOUT PREDEFINITO (layouts/default.vue)

	Replica esatta del prototipo Layout.tsx:
	- Sticky header (gestito in Header.vue)
	- Main content: background gradient #F8F9FB -> #EEF0F3
	- Scroll-to-top: fixed bottom-[80px] right-[16px], teal, appare dopo 400px
	- Help button: fixed bottom-[24px] right-[16px], gradient teal
-->
<script setup>
const { isAuthenticatedForUi } = useAuthUiState();
const { openAuthModal } = useAuthModal();
const route = useRoute();
const { isAccountRoute, isAuthPageRoute, isQuoteFlowRoute } = useShellRouteState();
const authUiHydrated = ref(false);
const showMarketingFooter = computed(() => !isAuthPageRoute.value && !isAccountRoute.value);
const showFloatingUtilities = computed(
	() => authUiHydrated.value && !isAuthPageRoute.value && !isQuoteFlowRoute.value && !isAccountRoute.value,
);

const getRequestedPath = () => {
	const redirectQuery = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect;

	if (typeof redirectQuery === 'string' && redirectQuery.startsWith('/')) {
		return redirectQuery;
	}

	return route.fullPath;
};

const showScrollTop = ref(false);
const showGuestHelp = ref(false);
const guestHelpPopoverRef = ref(null);

const scrollToTop = () => {
	window.scrollTo({ top: 0, behavior: 'smooth' });
};

const onScroll = () => {
	showScrollTop.value = window.scrollY > 400;
};

const closeGuestHelp = () => {
	showGuestHelp.value = false;
};

const toggleGuestHelp = () => {
	showGuestHelp.value = !showGuestHelp.value;
};

const openSupportAuthModal = () => {
	closeGuestHelp();
	openAuthModal({
		redirect: '/account/assistenza',
		tab: 'login',
	});
};

const onWindowKeydown = (event) => {
	if (event.key === 'Escape') {
		closeGuestHelp();
	}
};

const onDocumentPointerDown = (event) => {
	if (!showGuestHelp.value) return;
	const target = event.target;
	if (!(target instanceof Node)) return;
	if (guestHelpPopoverRef.value?.contains(target)) return;
	closeGuestHelp();
};

onMounted(() => {
	authUiHydrated.value = true;
	onScroll();
	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('keydown', onWindowKeydown);
	document.addEventListener('mousedown', onDocumentPointerDown);
	document.addEventListener('touchstart', onDocumentPointerDown, { passive: true });
});

onUnmounted(() => {
	window.removeEventListener('scroll', onScroll);
	window.removeEventListener('keydown', onWindowKeydown);
	document.removeEventListener('mousedown', onDocumentPointerDown);
	document.removeEventListener('touchstart', onDocumentPointerDown);
});
</script>

<template>
	<div class="w-full min-h-screen flex flex-col overflow-x-clip" style="font-family: 'Inter', sans-serif">
		<a
			href="#main-content"
			class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded-[18px] focus:shadow-lg focus:text-[var(--color-brand-primary)] focus:font-semibold">
			Vai al contenuto
		</a>
		<Header />

		<!-- Main content with prototype gradient bg -->
		<main
			id="main-content"
			class="flex-1 w-full max-w-full mx-auto overflow-x-clip"
			style="background: linear-gradient(180deg, #F8F9FB 0%, #EEF0F3 100%)"
		>
			<slot />
		</main>

		<Footer v-if="showMarketingFooter" />
		<ClientOnly>
			<AuthOverlayModal v-if="!isAuthPageRoute" />
		</ClientOnly>

		<!-- Scroll to top — animated, prototype position: bottom-[80px] right-[16px] -->
		<Transition name="scroll-top-fade">
			<button
				v-if="showScrollTop && showFloatingUtilities"
				@click="scrollToTop"
				class="fixed bottom-[24px] left-[16px] sm:bottom-[24px] sm:left-[20px] z-[999] w-[48px] h-[48px] rounded-full bg-[var(--color-brand-primary)] text-white flex items-center justify-center cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 active:scale-95 transition-all duration-200"
				style="box-shadow: 0 4px 14px rgba(9, 88, 102, 0.25)"
				title="Torna su"
				aria-label="Torna in cima alla pagina">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="18 15 12 9 6 15"></polyline>
				</svg>
			</button>
		</Transition>

		<!-- Help floating button — prototype: gradient teal, bottom-[24px] right-[16px] -->
		<div
			v-if="showFloatingUtilities"
			ref="guestHelpPopoverRef"
			class="fixed bottom-[24px] right-[16px] sm:bottom-[24px] sm:right-[20px] z-[999]">
			<NuxtLink
				v-show="isAuthenticatedForUi"
				to="/account/assistenza"
				class="layout-help-btn w-[48px] h-[48px] rounded-full text-white flex items-center justify-center cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 active:scale-95 transition-all duration-200"
				title="Assistenza"
				aria-label="Assistenza">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
				</svg>
			</NuxtLink>

			<button
				v-show="!isAuthenticatedForUi"
				type="button"
				@click="toggleGuestHelp"
				class="layout-help-btn w-[48px] h-[48px] rounded-full text-white flex items-center justify-center cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 active:scale-95 transition-all duration-200"
				aria-label="Aiuto"
				:aria-expanded="showGuestHelp ? 'true' : 'false'"
				aria-controls="guest-help-popover"
				title="Aiuto">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
				</svg>
			</button>

			<Transition name="popover-fade">
				<div
					v-if="showGuestHelp && !isAuthenticatedForUi"
					id="guest-help-popover"
					role="dialog"
					aria-label="Supporto"
					class="absolute bottom-[58px] right-0 w-[280px] bg-white border border-[var(--color-brand-border)] rounded-[18px] shadow-lg p-[14px]">
					<p class="text-[0.875rem] font-semibold text-[var(--color-brand-text)]">Serve supporto?</p>
					<p class="text-[0.8125rem] text-[#64748B] mt-[4px]">Puoi contattarci subito oppure accedere per aprire e seguire i ticket.</p>
					<div class="mt-[10px] grid grid-cols-1 gap-[8px]">
						<NuxtLink
							to="/contatti"
							class="inline-flex items-center justify-center h-[36px] rounded-full bg-[var(--color-brand-primary)] text-white text-[0.8125rem] font-semibold hover:bg-[var(--color-brand-primary-hover)] transition-colors"
							@click="closeGuestHelp">
							Contattaci
						</NuxtLink>
						<button
							type="button"
							class="inline-flex items-center justify-center h-[36px] rounded-full border border-[var(--color-brand-border)] text-[var(--color-brand-text)] text-[0.8125rem] font-semibold hover:bg-[var(--color-brand-bg)] transition-colors cursor-pointer"
							@click="openSupportAuthModal">
							Accedi per ticket
						</button>
					</div>
				</div>
			</Transition>
		</div>

		<CookieBanner />

		<!-- Global live region for screen reader announcements -->
		<div id="a11y-live-region" aria-live="polite" aria-atomic="true" class="sr-only"></div>
	</div>
</template>

<style scoped>
/* Help button — prototype gradient */
.layout-help-btn {
	background: linear-gradient(135deg, #095866, #0a7489);
	box-shadow: 0 6px 20px rgba(9, 88, 102, 0.3);
	transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.layout-help-btn:hover {
	transform: scale(1.08) translateY(-2px);
	box-shadow: 0 8px 24px rgba(9, 88, 102, 0.35);
}
.layout-help-btn:active {
	transform: scale(0.95);
}

/* Scroll-to-top fade transition */
.scroll-top-fade-enter-active {
	transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.scroll-top-fade-leave-active {
	transition: opacity 0.3s ease, transform 0.3s ease;
}
.scroll-top-fade-enter-from {
	opacity: 0;
	transform: scale(0.8) translateY(10px);
}
.scroll-top-fade-leave-to {
	opacity: 0;
	transform: scale(0.8) translateY(10px);
}

/* Popover fade transition */
.popover-fade-enter-active {
	transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}
.popover-fade-leave-active {
	transition: opacity 0.15s ease, transform 0.15s ease;
}
.popover-fade-enter-from {
	opacity: 0;
	transform: translateY(4px);
}
.popover-fade-leave-to {
	opacity: 0;
	transform: translateY(4px);
}
</style>
