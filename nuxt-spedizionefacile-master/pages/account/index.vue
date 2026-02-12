<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const { user, logout } = useSanctumAuth();

const accountPages = [
	{
		title: "Spedizioni",
		description: "Crea una nuova spedizione o riprendi una bozza. Controlla stato, etichetta e tracking.",
		url: "/spedizioni",
		visible: true,
		iconBg: "bg-[#e8f4fb]",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#1a7fba" d="M18 18.5a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m1.5-9l1.96 2.5H17V9.5m-11 9a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 6 15.5A1.5 1.5 0 0 1 7.5 17A1.5 1.5 0 0 1 6 18.5M20 8h-3V4H3c-1.11 0-2 .89-2 2v11h2a3 3 0 0 0 3 3a3 3 0 0 0 3-3h6a3 3 0 0 0 3 3a3 3 0 0 0 3-3h2v-5z"/></svg>`,
	},
	{
		title: "Spedizioni configurate",
		description: "Visualizza le spedizioni configurate nel carrello pronte per il pagamento.",
		url: "/spedizioni",
		visible: true,
		iconBg: "bg-[#e6f7f5]",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#0a8a7a" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18c-.21 0-.41-.06-.57-.18l-7.9-4.44A.99.99 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18c.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88zM12 4.15L6.04 7.5L12 10.85l5.96-3.35zM5 15.91l6 3.37v-6.73L5 9.18zm14 0V9.18l-6 3.37v6.73z"/></svg>`,
	},
	{
		title: "Carte e pagamenti",
		description: "Gestisci i metodi di pagamento e le preferenze. Visualizza lo storico dei pagamenti.",
		url: "/carte",
		visible: true,
		iconBg: "bg-[#e8f4fb]",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#1a7fba" d="M20 8H4V6h16m0 12H4v-6h16m0-8H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2"/></svg>`,
	},
	{
		title: "Indirizzi",
		description: "Salva mittenti e destinatari. Riutilizza indirizzi e rendi più veloce ogni ordine.",
		url: "/indirizzi",
		visible: true,
		iconBg: "bg-[#e6f7f5]",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#0a8a7a" d="M12 11.5A2.5 2.5 0 0 1 9.5 9A2.5 2.5 0 0 1 12 6.5A2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7"/></svg>`,
	},
	{
		title: "Profilo e dati",
		description: "Aggiorna i tuoi dati personali e di fatturazione. Modifica email e password in sicurezza.",
		url: "/profilo",
		visible: true,
		iconBg: "bg-[#e8f4fb]",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#1a7fba" d="M12 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4"/></svg>`,
	},
	{
		title: "Account Pro",
		description: "Richiedi il profilo Pro e sblocca vantaggi su volumi e funzioni avanzate.",
		url: "/account-pro",
		visible: true,
		iconBg: "bg-[#e8f4fb]",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#1a7fba" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2L9.19 8.62L2 9.24l5.45 4.73L5.82 21z"/></svg>`,
	},
	{
		title: "Portafoglio",
		description: "Ricarica il portafoglio e paga più velocemente le spedizioni. Consulta saldo e movimenti.",
		url: "/portafoglio",
		visible: true,
		iconBg: "bg-[#e6f7f5]",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#0a8a7a" d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2zm-9-2h10V8H12zm4-2.5a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5"/></svg>`,
	},
	{
		title: "Assistenza",
		description: "Apri un ticket o contattaci. Segui risposte e aggiornamenti sulle tue richieste.",
		url: "/assistenza",
		visible: true,
		iconBg: "bg-[#e8f4fb]",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#1a7fba" d="M12 1a9 9 0 0 0-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7a9 9 0 0 0-9-9"/></svg>`,
	},
	{
		title: "Bonus",
		description: "Scopri promozioni e bonus disponibili. Approfitta delle offerte per risparmiare sulle spedizioni.",
		url: "/bonus",
		visible: true,
		iconBg: "bg-[#e8f4fb]",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#1a7fba" d="M9.06 1.93C7.17 1.92 5.33 3.74 6.17 6H3a2 2 0 0 0-2 2v2a1 1 0 0 0 1 1h9V8h2v3h9a1 1 0 0 0 1-1V8a2 2 0 0 0-2-2h-3.17C19 2.73 14.6.42 12.57 3.24L12 4l-.57-.78c-.63-.89-1.5-1.3-2.37-1.29M9 4c.89 0 1.34 1.08.71 1.71S8 5.89 8 5a1 1 0 0 1 1-1m6 0a1 1 0 0 1 1 1c0 .89-1.08 1.34-1.71.71S14.11 4 15 4M2 12v8a2 2 0 0 0 2 2h7v-10zm11 0v10h7a2 2 0 0 0 2-2v-8z"/></svg>`,
	},
	{
		title: "Prelievi",
		description: "Richiedi l'accredito del saldo disponibile. Controlla stato e tempi di pagamento.",
		url: "/prelievi",
		visible: user.value?.role === "Partner Pro" || user.value?.role === "Admin",
		iconBg: "bg-[#e6f7f5]",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#0a8a7a" d="M5 6h14v2H5zm0 4h14v2H5zm0 4h14v2H5zm0 4h14v2H5zM3 4v2h2V4zm0 4v2h2V8zm0 4v2h2v-2zm0 4v2h2v-2zM19 4v2h2V4zm0 4v2h2V8zm0 4v2h2v-2zm0 4v2h2v-2z"/></svg>`,
	},
	{
		title: "Amministrazione",
		description: "Gestisci prelievi, movimenti utenti e statistiche referral dal pannello di controllo.",
		url: "/amministrazione",
		visible: user.value?.role === "Admin",
		iconBg: "bg-[#f3e8ff]",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#7c3aed" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12c5.16-1.26 9-6.45 9-12V5zm0 2.18l7 3.12v5.7c0 4.83-3.23 9.36-7 10.57c-3.77-1.21-7-5.74-7-10.57V6.3zM12 8a1.5 1.5 0 0 0-1.5 1.5a1.5 1.5 0 0 0 .58 1.19L9.43 15h5.14l-1.65-4.31A1.5 1.5 0 0 0 13.5 9.5A1.5 1.5 0 0 0 12 8"/></svg>`,
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
							<span v-html="page.svg"></span>
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
