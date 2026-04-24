<script setup>
import { accountCardIcons } from '~/utils/accountNavigation';

/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ['app-auth'],
});

useSeoMeta({
	title: 'Bonus account | SpediamoFacile',
	ogTitle: 'Bonus account | SpediamoFacile',
	description: 'Consulta bonus, inviti, wallet e opportunita Partner Pro dalla tua area account SpediamoFacile.',
	ogDescription: 'Bonus e promozioni disponibili nell area account SpediamoFacile.',
	robots: 'noindex, nofollow',
});

const { user } = useSanctumAuth();
const { uiSnapshot } = useAuthUiState();

/* Controlla se l'utente è Partner Pro */
const effectiveRole = computed(() => uiSnapshot.value.role || user.value?.role || null);
const isPro = computed(() => effectiveRole.value === 'Partner Pro');

/**
 * Lista di tutti i bonus disponibili.
 * Ogni bonus ha: icona, titolo, descrizione, badge, link
 * e flag "proOnly" (visibile solo ai Pro) e "available" (se mostrarlo).
 */
const bonuses = computed(() => [
	{
		iconKey: 'share-variant',
		title: 'Invita un amico',
		description:
			'Condividi il tuo codice invito e guadagna il 5% di commissione su ogni spedizione. Il tuo amico riceve il 5% di sconto.',
		badge: '5% commissione',
		badgeColor: 'bg-[#f0fdf4] text-[#0a8a7a]',
		meta: 'Attivo per Partner Pro',
		available: true,
		proOnly: true,
		action: '/account/account-pro',
		actionLabel: 'Vai al codice invito',
	},
	{
		iconKey: 'wallet',
		title: 'Ricarica e risparmia',
		description: 'Ricarica il portafoglio per pagare le spedizioni in modo rapido e conveniente. Nessuna commissione sulle ricariche.',
		badge: '0% commissioni',
		badgeColor: 'bg-[#F0F6F7] text-[var(--color-brand-primary)]',
		meta: 'Wallet pronto per checkout e ricariche',
		available: true,
		proOnly: false,
		action: '/account/portafoglio',
		actionLabel: 'Apri portafoglio',
	},
	{
		iconKey: 'account',
		title: 'Diventa Partner Pro',
		description: 'Sblocca vantaggi esclusivi: codice invito personale, commissioni sulle vendite e funzioni avanzate.',
		badge: 'Pro',
		badgeColor: 'bg-[#FFFBEB] text-[#B45309]',
		meta: "Richiesta guidata dall'area account",
		available: !isPro.value,
		proOnly: false,
		action: '/account/account-pro',
		actionLabel: 'Scopri Partner Pro',
	},
]);

/* Filtra i bonus: nasconde quelli "solo Pro" se l'utente non è Pro, e quelli non disponibili */
const filteredBonuses = computed(() => {
	return bonuses.value.filter((b) => {
		if (b.proOnly && !isPro.value) return false;
		return b.available;
	});
});

const bonusHeaderStats = computed(() => [
	{ label: 'Disponibili', value: `${filteredBonuses.value.length} voci` },
	{ label: 'Partner Pro', value: isPro.value ? 'Attivo' : 'Opzionale' },
]);
const bonusHero = computed(() => ({
	title: 'Bonus e promozioni',
	description: 'Controlla vantaggi attivi, credito wallet e opportunita disponibili dalla tua area account.',
}));
const bonusSummary = computed(() => ({
	kicker: 'Opportunita attive',
	value: `${filteredBonuses.value.length}`,
	label: filteredBonuses.value.length === 1 ? 'bonus disponibile' : 'bonus disponibili',
	description: isPro.value
		? 'Il tuo profilo Partner Pro vede inviti, wallet e vantaggi operativi nello stesso punto.'
		: 'Wallet e promozioni restano subito leggibili, con il passaggio a Partner Pro sempre a portata.',
}));
const bonusFooterCta = computed(() => {
	if (isPro.value) {
		return {
			title: 'Partner Pro gia attivo',
			description: 'Continua da codice invito, wallet e prelievi senza cambiare flusso.',
			to: '/account/account-pro',
			label: 'Apri area Partner Pro',
		};
	}
	return {
		title: 'Vuoi sbloccare di piu?',
		description: 'Passa a Partner Pro per ottenere codice invito personale, commissioni e strumenti dedicati.',
		to: '/account/account-pro',
		label: 'Scopri Partner Pro',
	};
});
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[20px] tablet:py-[24px] desktop:py-[28px]">
		<div class="my-container max-w-[1280px]">
			<AccountPageHeader
				class="sf-account-shell-hero--compact"
				eyebrow="Bonus"
				:title="bonusHero.title"
				:description="bonusHero.description"
				current="Bonus">
				<template #actions>
					<div class="flex flex-wrap items-center gap-[8px]">
						<span
							v-for="item in bonusHeaderStats"
							:key="item.label"
							class="sf-section-chip">{{ item.label }}: {{ item.value }}</span>
					</div>
				</template>
			</AccountPageHeader>

			<div class="mb-[20px] grid gap-[14px] desktop:grid-cols-[minmax(0,1.2fr)_minmax(0,0.45fr)_minmax(0,0.45fr)]">
				<div class="sf-section-block p-[20px] relative overflow-hidden">
					<span class="absolute left-0 top-[22px] w-[3px] h-[28px] rounded-r-[3px] bg-[#E44203]"></span>
					<p class="sf-account-kicker">{{ bonusSummary.kicker }}</p>
					<div class="mt-[10px] flex flex-col gap-[10px] tablet:flex-row tablet:items-end tablet:justify-between">
						<div>
							<p class="font-montserrat text-[2rem] leading-none font-[800] text-[var(--color-brand-text)] tracking-[-0.01em]">{{ bonusSummary.value }}</p>
							<p class="mt-[4px] text-[0.875rem] font-semibold text-[var(--color-brand-text)]">{{ bonusSummary.label }}</p>
						</div>
						<NuxtLink
							:to="bonusFooterCta.to"
							class="btn btn-secondary btn-sm inline-flex items-center justify-center">
							{{ bonusFooterCta.label }}
						</NuxtLink>
					</div>
					<p class="mt-[12px] text-[0.8125rem] leading-[1.6] text-[var(--color-brand-text-secondary)]">
						{{ bonusSummary.description }}
					</p>
				</div>
				<div
					v-for="item in bonusHeaderStats"
					:key="`${item.label}-summary`"
					class="sf-account-metric-card">
					<div class="flex items-center gap-[10px]">
						<span class="sf-account-metric-card__icon">
							<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/></svg>
						</span>
						<p class="sf-account-metric-card__label">{{ item.label }}</p>
					</div>
					<p class="sf-account-metric-card__value">{{ item.value }}</p>
					<p class="sf-account-metric-card__meta">
						{{ item.label === 'Disponibili' ? 'Opportunita attive raccolte qui, senza rumore.' : 'Lo stato Partner Pro guida cosa vedi e cosa puoi attivare.' }}
					</p>
				</div>
			</div>

			<div v-if="filteredBonuses.length > 0" class="grid gap-[14px] desktop:grid-cols-2 sf-animate-in sf-animate-in-1">
				<NuxtLink
					v-for="bonus in filteredBonuses"
					:key="bonus.title"
					:to="bonus.action"
					class="group sf-card-hover relative block overflow-hidden rounded-[16px] border border-[#E2E8EE] bg-white p-[20px]"
					style="box-shadow: 0 3px 14px rgba(15,23,42,0.04);">
					<div class="absolute right-[-34px] top-[-34px] h-[86px] w-[86px] rounded-full opacity-[0.06] transition-opacity duration-[500ms] group-hover:opacity-[0.12]" style="background: radial-gradient(circle, var(--color-brand-primary), transparent);"></div>

					<div class="relative z-[1] flex h-full flex-col">
						<div class="flex items-start gap-[14px]">
							<div class="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px]" style="background: linear-gradient(135deg, var(--color-brand-primary), #0b7d92); box-shadow: 0 4px 12px rgba(9,88,102,0.2);">
								<svg
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[20px] w-[20px]"
									fill="#ffffff"
									v-html="accountCardIcons[bonus.iconKey]"></svg>
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-[8px]">
									<h2 class="font-montserrat text-[1rem] font-[800] tracking-[-0.2px] text-[var(--color-brand-text)]">{{ bonus.title }}</h2>
									<span :class="['inline-flex items-center rounded-full px-[8px] py-[2px] text-[0.625rem] font-[700]', bonus.badgeColor]">
										{{ bonus.badge }}
									</span>
								</div>
								<p class="mt-[8px] text-[0.875rem] leading-[1.6] text-[var(--color-brand-text-secondary)]">
									{{ bonus.description }}
								</p>
							</div>
						</div>

						<div class="mt-[14px] rounded-[14px] border border-[rgba(9,88,102,0.08)] bg-[#FBFCFD] px-[14px] py-[12px]">
							<p class="text-[0.6875rem] font-[700] uppercase tracking-[0.9px] text-[var(--color-brand-text-muted)]">Stato bonus</p>
							<p class="mt-[6px] text-[0.875rem] font-[700] text-[var(--color-brand-text)]">{{ bonus.meta }}</p>
						</div>

						<div class="mt-[16px] flex items-center justify-between border-t border-[rgba(9,88,102,0.08)] pt-[14px]">
							<span class="text-[0.8125rem] font-semibold text-[var(--color-brand-primary)]">{{ bonus.actionLabel }}</span>
							<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-60 transition-all duration-[350ms] group-hover:translate-x-[3px] group-hover:opacity-100"><path d="M9 18l6-6-6-6"/></svg>
						</div>
					</div>
				</NuxtLink>
			</div>

			<div v-else class="flex flex-col items-center justify-center py-[32px] text-center">
				<div class="w-[44px] h-[44px] rounded-[14px] bg-[#F5F6F9] flex items-center justify-center mb-[12px]">
					<svg aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						class="h-[22px] w-[22px]"
						fill="#095866" opacity="0.4"
						v-html="accountCardIcons['tag-multiple']"></svg>
				</div>
				<p class="text-[var(--color-brand-text-muted)] text-[14px] font-[500]">Nessun bonus disponibile al momento</p>
			</div>

			<div class="sf-section-block mt-[20px] p-[20px] relative overflow-hidden">
				<span class="absolute left-0 top-[22px] w-[3px] h-[28px] rounded-r-[3px] bg-[#E44203]"></span>
				<p class="sf-account-kicker">Prossimo passo</p>
				<h2 class="mt-[8px] font-montserrat text-[17px] font-[700] tracking-[-0.01em] text-[var(--color-brand-text)]">{{ bonusFooterCta.title }}</h2>
				<p class="mt-[6px] text-[14px] leading-[1.55] text-[var(--color-brand-text-secondary)] max-w-[560px]">
					{{ bonusFooterCta.description }}
				</p>
				<div class="mt-[14px]">
					<NuxtLink
						:to="bonusFooterCta.to"
						class="btn btn-primary inline-flex items-center justify-center">
						{{ bonusFooterCta.label }}
					</NuxtLink>
				</div>
			</div>
		</div>
	</section>
</template>

