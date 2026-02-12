<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const { user, logout } = useSanctumAuth();

const accountPages = [
	{
		icon: "mdi:truck-fast-outline",
		title: "Spedizioni",
		description: "Crea una nuova spedizione o riprendi una bozza. Controlla stato, etichetta e tracking.",
		url: "/spedizioni",
		visible: true,
		iconColor: "text-[#1a7fba]",
		iconBg: "bg-[#e8f4fb]",
	},
	{
		icon: "mdi:credit-card-outline",
		title: "Carte e pagamenti",
		description: "Gestisci i metodi di pagamento e le preferenze. Visualizza lo storico dei pagamenti.",
		url: "/carte",
		visible: true,
		iconColor: "text-[#1a7fba]",
		iconBg: "bg-[#e8f4fb]",
	},
	{
		icon: "mdi:map-marker-outline",
		title: "Indirizzi",
		description: "Salva mittenti e destinatari. Riutilizza indirizzi e rendi più veloce ogni ordine.",
		url: "/indirizzi",
		visible: true,
		iconColor: "text-[#0a8a7a]",
		iconBg: "bg-[#e6f7f5]",
	},
	{
		icon: "mdi:account-circle-outline",
		title: "Profilo e dati",
		description: "Aggiorna i tuoi dati personali e di fatturazione. Modifica email e password in sicurezza.",
		url: "/profilo",
		visible: true,
		iconColor: "text-[#1a7fba]",
		iconBg: "bg-[#e8f4fb]",
	},
	{
		icon: "mdi:star-circle-outline",
		title: "Account Pro",
		description: "Richiedi il profilo Pro e sblocca vantaggi su volumi e funzioni avanzate.",
		url: "/account-pro",
		visible: true,
		iconColor: "text-[#1a7fba]",
		iconBg: "bg-[#e8f4fb]",
	},
	{
		icon: "mdi:wallet-outline",
		title: "Portafoglio",
		description: "Ricarica il portafoglio e paga più velocemente le spedizioni. Consulta saldo e movimenti.",
		url: "/portafoglio",
		visible: true,
		iconColor: "text-[#0a8a7a]",
		iconBg: "bg-[#e6f7f5]",
	},
	{
		icon: "mdi:headset",
		title: "Assistenza",
		description: "Apri un ticket o contattaci. Segui risposte e aggiornamenti sulle tue richieste.",
		url: "/assistenza",
		visible: true,
		iconColor: "text-[#1a7fba]",
		iconBg: "bg-[#e8f4fb]",
	},
	{
		icon: "mdi:gift-outline",
		title: "Bonus",
		description: "Scopri promozioni e bonus disponibili. Approfitta delle offerte per risparmiare sulle spedizioni.",
		url: "/bonus",
		visible: true,
		iconColor: "text-[#1a7fba]",
		iconBg: "bg-[#e8f4fb]",
	},
	{
		icon: "mdi:cash-multiple",
		title: "Prelievi",
		description: "Richiedi l'accredito del saldo disponibile. Controlla stato e tempi di pagamento.",
		url: "/prelievi",
		visible: user.value?.role === "Partner Pro" || user.value?.role === "Admin",
		iconColor: "text-[#0a8a7a]",
		iconBg: "bg-[#e6f7f5]",
	},
	{
		icon: "mdi:shield-crown-outline",
		title: "Amministrazione",
		description: "Gestisci prelievi, movimenti utenti e statistiche referral dal pannello di controllo.",
		url: "/amministrazione",
		visible: user.value?.role === "Admin",
		iconColor: "text-[#7c3aed]",
		iconBg: "bg-[#f3e8ff]",
	},
];

const filteredPages = accountPages.filter((page) => page.visible === true);

const isLoggingOut = ref(false);

const handleLogout = async () => {
	isLoggingOut.value = true;
	try {
		await logout();
	} finally {
		isLoggingOut.value = false;
	}
};
</script>

<template>
	<!-- Header with wave background -->
	<div class="relative bg-gradient-to-br from-[#d5dde0] via-[#e2e7ea] to-[#d8dfe3] pt-[40px] pb-[60px] desktop:pt-[50px] desktop:pb-[70px] overflow-hidden">
		<!-- Decorative wave shapes -->
		<div class="absolute inset-0 opacity-30">
			<svg class="absolute top-0 left-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
				<path fill="rgba(255,255,255,0.4)" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,170.7C1248,160,1344,128,1392,112L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
			</svg>
			<svg class="absolute top-[20px] left-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
				<path fill="rgba(255,255,255,0.25)" d="M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,181.3C672,192,768,160,864,138.7C960,117,1056,107,1152,117.3C1248,128,1344,160,1392,176L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
			</svg>
		</div>
		<div class="my-container max-w-[1100px] relative z-10">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-[1.75rem] desktop:text-[2.25rem] font-bold text-[#252B42] tracking-tight">
						Il tuo account
					</h1>
					<p class="text-[0.875rem] text-[#555] mt-[4px]">
						<span v-if="user?.role === 'Partner Pro'" class="inline-block px-[8px] py-[2px] rounded-full bg-[#095866]/10 text-[#095866] text-[0.75rem] font-medium mr-[6px]">Partner Pro</span>
						<span v-else-if="user?.role === 'Admin'" class="inline-block px-[8px] py-[2px] rounded-full bg-purple-100 text-purple-700 text-[0.75rem] font-medium mr-[6px]">Admin</span>
						Ciao, {{ user?.name }} {{ user?.surname }}
					</p>
				</div>
				<button
					@click="handleLogout"
					:disabled="isLoggingOut"
					class="px-[20px] py-[10px] bg-white/70 backdrop-blur-sm border border-[#d0d0d0] rounded-[8px] text-[0.875rem] text-[#555] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer">
					{{ isLoggingOut ? "Uscita..." : "Esci" }}
				</button>
			</div>
		</div>
	</div>

	<!-- Cards Grid Section -->
	<section class="py-[40px] desktop:py-[56px]">
		<div class="my-container max-w-[1100px]">
			<ul class="grid grid-cols-1 account-pages:grid-cols-2 desktop:grid-cols-3 gap-[20px] desktop:gap-[24px]">
				<li
					v-for="(page, pageIndex) in filteredPages"
					:key="pageIndex">
					<NuxtLink
						:to="`/account${page.url}`"
						class="account-card flex flex-col items-center text-center h-full min-h-[220px] desktop:min-h-[240px] bg-[#e8eaec] rounded-[16px] p-[28px] desktop:p-[32px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:bg-[#e2e5e8] transition-all group">
						<!-- Icon -->
						<div :class="['w-[64px] h-[64px] rounded-full flex items-center justify-center mb-[16px]', page.iconBg]">
							<Icon :name="page.icon" :class="['text-[32px]', page.iconColor]" />
						</div>
						<!-- Title -->
						<h2 class="text-[1rem] desktop:text-[1.125rem] text-[#252B42] font-bold tracking-[0.1px] group-hover:text-[#095866] transition-colors">
							{{ page.title }}
						</h2>
						<!-- Description -->
						<p class="text-[#737373] text-[0.8125rem] tracking-[0.2px] leading-[1.6] mt-[8px] flex-1">
							{{ page.description }}
						</p>
					</NuxtLink>
				</li>
			</ul>
		</div>
	</section>
</template>
