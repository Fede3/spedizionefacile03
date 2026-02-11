<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const { user, logout } = useSanctumAuth();

const accountPages = [
	{
		icon: "mdi:shield-crown-outline",
		title: "Amministrazione",
		description: "Gestisci prelievi, movimenti utenti e statistiche referral dal pannello di controllo.",
		url: "/amministrazione",
		visible: user.value?.role === "Admin",
		color: "bg-purple-50 text-purple-600",
	},
	{
		icon: "mdi:truck-fast-outline",
		title: "Spedizioni",
		description: "Crea una nuova spedizione o riprendi una bozza. Controlla stato, etichetta e tracking.",
		url: "/spedizioni",
		visible: true,
		color: "bg-blue-50 text-blue-600",
	},
	{
		icon: "mdi:wallet-outline",
		title: "Portafoglio",
		description: "Ricarica il portafoglio e paga le spedizioni. Consulta saldo e movimenti.",
		url: "/portafoglio",
		visible: true,
		color: "bg-emerald-50 text-emerald-600",
	},
	{
		icon: "mdi:credit-card-outline",
		title: "Carte e pagamenti",
		description: "Gestisci i metodi di pagamento e le preferenze. Visualizza lo storico.",
		url: "/carte",
		visible: true,
		color: "bg-orange-50 text-orange-600",
	},
	{
		icon: "mdi:map-marker-outline",
		title: "Indirizzi",
		description: "Salva mittenti e destinatari. Riutilizza indirizzi per ogni ordine.",
		url: "/indirizzi",
		visible: true,
		color: "bg-rose-50 text-rose-600",
	},
	{
		icon: "mdi:account-outline",
		title: "Profilo e dati",
		description: "Aggiorna i tuoi dati personali e di fatturazione. Modifica email e password.",
		url: "/profilo",
		visible: true,
		color: "bg-slate-50 text-slate-600",
	},
	{
		icon: "mdi:star-outline",
		title: "Account Pro",
		description: "Gestisci il tuo codice referral, visualizza commissioni e guadagni.",
		url: "/account-pro",
		visible: true,
		color: "bg-amber-50 text-amber-600",
	},
	{
		icon: "mdi:cash-multiple",
		title: "Prelievi",
		description: "Richiedi l'accredito delle commissioni. Controlla stato e tempi di pagamento.",
		url: "/prelievi",
		visible: user.value?.role === "Partner Pro",
		color: "bg-teal-50 text-teal-600",
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
	<section class="desktop-xl:my-[80px] my-[40px] desktop:my-[60px]">
		<div class="my-container max-w-[1100px]">
			<!-- Welcome Header -->
			<div class="flex items-center justify-between mb-[40px] desktop:mb-[56px]">
				<div>
					<h1 class="text-[1.5rem] desktop:text-[2rem] font-bold text-[#252B42] tracking-tight">
						Ciao, {{ user?.name }}
					</h1>
					<p class="text-[0.875rem] text-[#737373] mt-[4px]">
						<span v-if="user?.role === 'Partner Pro'" class="inline-block px-[8px] py-[2px] rounded-full bg-[#095866]/10 text-[#095866] text-[0.75rem] font-medium mr-[6px]">Partner Pro</span>
						<span v-else-if="user?.role === 'Admin'" class="inline-block px-[8px] py-[2px] rounded-full bg-purple-50 text-purple-700 text-[0.75rem] font-medium mr-[6px]">Admin</span>
						{{ user?.email }}
					</p>
				</div>
				<button
					@click="handleLogout"
					:disabled="isLoggingOut"
					class="px-[20px] py-[10px] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] text-[#737373] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer">
					{{ isLoggingOut ? "Uscita..." : "Esci" }}
				</button>
			</div>

			<!-- Cards Grid -->
			<ul class="grid grid-cols-1 account-pages:grid-cols-2 desktop:grid-cols-3 gap-[20px] desktop:gap-[24px]">
				<li
					v-for="(page, pageIndex) in filteredPages"
					:key="pageIndex">
					<NuxtLink
						:to="`/account${page.url}`"
						class="flex flex-col h-full min-h-[180px] desktop:min-h-[220px] bg-white rounded-[16px] border border-[#E9EBEC] p-[24px] desktop:p-[28px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-[#C8CCD0] transition-all group">
						<div :class="['w-[48px] h-[48px] rounded-[12px] flex items-center justify-center mb-[16px]', page.color]">
							<Icon :name="page.icon" class="text-[24px]" />
						</div>
						<h2 class="text-[1rem] desktop:text-[1.125rem] text-[#252B42] font-bold tracking-[0.1px] group-hover:text-[#095866] transition-colors">
							{{ page.title }}
						</h2>
						<p class="text-[#737373] text-[0.8125rem] tracking-[0.2px] leading-[1.6] mt-[8px] flex-1">
							{{ page.description }}
						</p>
					</NuxtLink>
				</li>
			</ul>
		</div>
	</section>
</template>
