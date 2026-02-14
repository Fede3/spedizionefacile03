/**
 * ADMIN - Portafogli
 * Panoramica saldi utenti e modale movimenti.
 */
<script setup>
definePageMeta({
	middleware: ["sanctum:auth", "admin"],
});

const sanctum = useSanctumClient();
const { formatCurrency, formatDate } = useAdmin();

const walletOverview = ref([]);

const fetchWallet = async () => {
	try {
		const res = await sanctum("/api/admin/wallet/overview");
		walletOverview.value = res?.data || res || [];
	} catch (e) { walletOverview.value = []; }
};

/* Modale movimenti utente */
const selectedUserId = ref(null);
const selectedUserName = ref("");
const userMovements = ref([]);

const viewUserMovements = async (userId, userName) => {
	selectedUserId.value = userId;
	selectedUserName.value = userName;
	try {
		const res = await sanctum(`/api/admin/wallet/users/${userId}/movements`);
		userMovements.value = res?.data || res || [];
	} catch (e) { userMovements.value = []; }
};

const closeUserMovements = () => {
	selectedUserId.value = null;
	selectedUserName.value = "";
	userMovements.value = [];
};

onMounted(() => { fetchWallet(); });
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container max-w-[1400px]">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Portafogli</span>
			</div>

			<NuxtLink to="/account" class="inline-flex items-center gap-[6px] text-[0.8125rem] text-[#095866] hover:underline font-medium mb-[20px]">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>
				Torna all'account
			</NuxtLink>

			<h1 class="text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Portafogli</h1>

			<!-- User movements modal -->
			<div v-if="selectedUserId" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-[20px]" @click.self="closeUserMovements">
				<div class="bg-white rounded-[20px] p-[28px] shadow-2xl max-w-[700px] w-full max-h-[80vh] overflow-y-auto">
					<div class="flex items-center justify-between mb-[24px]">
						<h3 class="text-[1.125rem] font-bold text-[#252B42]">Movimenti di {{ selectedUserName }}</h3>
						<button @click="closeUserMovements" class="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#F0F0F0] hover:bg-[#E0E0E0] cursor-pointer">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#404040]" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
						</button>
					</div>
					<div v-if="!userMovements?.length" class="text-center py-[40px] text-[#737373]"><p>Nessun movimento per questo utente.</p></div>
					<ul v-else class="space-y-[4px]">
						<li v-for="mov in userMovements" :key="mov.id" class="flex items-center justify-between p-[12px] rounded-[10px] hover:bg-[#F8F9FB]">
							<div class="flex-1 min-w-0">
								<p class="text-[0.875rem] font-medium text-[#252B42] truncate">{{ mov.description }}</p>
								<div class="flex items-center gap-[8px] mt-[2px]">
									<span class="text-[0.75rem] text-[#737373]">{{ formatDate(mov.created_at) }}</span>
									<span v-if="mov.source" class="text-[0.6875rem] px-[8px] py-[2px] rounded-full bg-[#F0F0F0] text-[#737373]">{{ mov.source }}</span>
								</div>
							</div>
							<span :class="['text-[0.9375rem] font-bold tabular-nums whitespace-nowrap ml-[16px]', mov.type === 'credit' ? 'text-emerald-600' : 'text-red-500']">
								{{ mov.type === "credit" ? "+" : "-" }}&euro;{{ formatCurrency(mov.amount) }}
							</span>
						</li>
					</ul>
				</div>
			</div>

			<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Utenti con movimenti</h2>
				<div v-if="!walletOverview?.length" class="text-center py-[48px] text-[#737373]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[40px] h-[40px] text-[#C8CCD0] mx-auto mb-[12px]" fill="currentColor"><path d="M5,6H23V18H5V6M14,9A3,3 0 0,1 17,12A3,3 0 0,1 14,15A3,3 0 0,1 11,12A3,3 0 0,1 14,9M9,8A2,2 0 0,1 7,10V14A2,2 0 0,1 9,16H19A2,2 0 0,1 21,14V10A2,2 0 0,1 19,8H9M1,10H3V20H19V22H1V10Z"/></svg>
					<p>Nessun utente con movimenti.</p>
				</div>
				<div v-else class="overflow-x-auto">
					<table class="w-full text-[0.875rem]">
						<thead>
							<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
								<th class="pb-[12px] font-medium">Utente</th>
								<th class="pb-[12px] font-medium">Email</th>
								<th class="pb-[12px] font-medium">Ruolo</th>
								<th class="pb-[12px] font-medium text-right">Saldo</th>
								<th class="pb-[12px] font-medium text-right">Commissioni</th>
								<th class="pb-[12px] font-medium text-center">Azioni</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(u, idx) in walletOverview" :key="u.id" :class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
								<td class="py-[14px] text-[#252B42] font-medium">{{ u.name }}</td>
								<td class="py-[14px] text-[#737373]">{{ u.email }}</td>
								<td class="py-[14px]">
									<span :class="['inline-block px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium', u.role === 'Partner Pro' ? 'bg-[#095866]/10 text-[#095866]' : u.role === 'Admin' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-600']">{{ u.role || "Cliente" }}</span>
								</td>
								<td class="py-[14px] text-right font-semibold text-[#252B42]">&euro;{{ formatCurrency(u.wallet_balance) }}</td>
								<td class="py-[14px] text-right font-semibold text-emerald-600">&euro;{{ formatCurrency(u.commission_balance) }}</td>
								<td class="py-[14px] text-center">
									<button @click="viewUserMovements(u.id, u.name)" class="text-[0.8125rem] text-[#095866] hover:underline cursor-pointer font-medium">Movimenti</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</section>
</template>
