<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const { user } = useSanctumAuth();

const isPro = computed(() => user.value?.role === "Partner Pro");

const bonuses = [
	{
		icon: "mdi:share-variant-outline",
		title: "Invita un amico",
		description: "Condividi il tuo codice referral e guadagna il 5% di commissione su ogni spedizione. Il tuo amico riceve il 5% di sconto.",
		badge: "5% Commissione",
		badgeColor: "bg-emerald-50 text-emerald-700",
		available: true,
		proOnly: true,
		action: "/account/account-pro",
		actionLabel: "Vai al codice referral",
	},
	{
		icon: "mdi:wallet-plus-outline",
		title: "Ricarica e risparmia",
		description: "Ricarica il portafoglio per pagare le spedizioni in modo rapido e conveniente. Nessuna commissione sulle ricariche.",
		badge: "0% commissioni",
		badgeColor: "bg-blue-50 text-blue-700",
		available: true,
		proOnly: false,
		action: "/account/portafoglio",
		actionLabel: "Ricarica ora",
	},
	{
		icon: "mdi:star-circle-outline",
		title: "Diventa Partner Pro",
		description: "Sblocca vantaggi esclusivi: codice referral personale, commissioni sulle vendite e funzioni avanzate.",
		badge: "Pro",
		badgeColor: "bg-amber-50 text-amber-700",
		available: !isPro.value,
		proOnly: false,
		action: "/account/account-pro",
		actionLabel: "Scopri di più",
	},
];

const filteredBonuses = computed(() => {
	return bonuses.filter((b) => {
		if (b.proOnly && !isPro.value) return false;
		return b.available;
	});
});
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container max-w-[900px]">
			<!-- Breadcrumb -->
			<div class="mb-[28px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Bonus</span>
			</div>

			<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42] mb-[8px]">Bonus e promozioni</h1>
			<p class="text-[#737373] text-[0.9375rem] mb-[32px]">Scopri i bonus e le promozioni disponibili per risparmiare sulle tue spedizioni.</p>

			<!-- Bonus Cards -->
			<div class="space-y-[16px]">
				<NuxtLink
					v-for="(bonus, index) in filteredBonuses"
					:key="index"
					:to="bonus.action"
					class="flex items-start gap-[20px] bg-white rounded-[20px] p-[24px] desktop:p-[28px] border border-[#E9EBEC] shadow-sm hover:shadow-md hover:border-[#C8CCD0] transition-all group">
					<!-- Icon -->
					<div class="w-[56px] h-[56px] rounded-[14px] bg-[#e8f4fb] flex items-center justify-center shrink-0">
						<Icon :name="bonus.icon" class="text-[28px] text-[#1a7fba]" />
					</div>

					<!-- Content -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-[10px] mb-[6px]">
							<h2 class="text-[1.0625rem] font-bold text-[#252B42] group-hover:text-[#095866] transition-colors">
								{{ bonus.title }}
							</h2>
							<span :class="['inline-block px-[10px] py-[3px] rounded-full text-[0.6875rem] font-semibold', bonus.badgeColor]">
								{{ bonus.badge }}
							</span>
						</div>
						<p class="text-[#737373] text-[0.875rem] leading-[1.6] mb-[12px]">
							{{ bonus.description }}
						</p>
						<span class="inline-flex items-center gap-[4px] text-[0.8125rem] text-[#095866] font-semibold group-hover:underline">
							{{ bonus.actionLabel }}
							<Icon name="mdi:arrow-right" class="text-[16px]" />
						</span>
					</div>
				</NuxtLink>
			</div>

			<!-- Empty state if no bonuses -->
			<div v-if="filteredBonuses.length === 0" class="bg-white rounded-[20px] p-[48px] shadow-sm border border-[#E9EBEC] text-center">
				<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
					<Icon name="mdi:gift-outline" class="text-[32px] text-[#C8CCD0]" />
				</div>
				<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessun bonus disponibile</h2>
				<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto leading-[1.6]">Al momento non ci sono promozioni attive. Torna a controllare presto!</p>
			</div>
		</div>
	</section>
</template>
