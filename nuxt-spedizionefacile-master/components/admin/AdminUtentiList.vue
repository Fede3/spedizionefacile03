<!--
  Lista utenti per la pagina admin utenti: mobile cards + desktop table.
-->
<script setup>
const props = defineProps({
	users: { type: Array, default: () => [] },
	actionLoading: { type: [String, Number, null], default: null },
	formatDate: { type: Function, required: true },
});

const emit = defineEmits(['approve', 'delete', 'role-change']);
</script>

<template>
	<div v-if="!users?.length" class="text-center py-[48px]">
		<div class="w-[64px] h-[64px] mx-auto mb-[16px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[28px] h-[28px]" fill="#C8CCD0"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>
		</div>
		<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[8px]">Nessun account trovato</h2>
		<p class="text-[#737373] text-[0.875rem]">Nessun utente corrisponde ai filtri selezionati.</p>
	</div>

	<template v-else>
		<!-- Mobile cards -->
		<div class="desktop:hidden grid grid-cols-1 tablet:grid-cols-2 gap-[12px]">
			<div v-for="u in users" :key="u.id" class="rounded-[18px] border border-[#E9EBEC] bg-white p-[14px] tablet:p-[16px] shadow-sm">
				<div class="flex items-start gap-[12px]">
					<div class="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] bg-[#EDF5F6] text-[#095866]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[20px] w-[20px]" fill="currentColor"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>
					</div>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-[8px]">
							<p class="min-w-0 flex-1 text-[0.9375rem] font-semibold text-[#252B42] leading-[1.3]">{{ u.name }} {{ u.surname }}</p>
							<span :class="u.email_verified_at ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'" class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-full text-[0.6875rem] font-medium">
								{{ u.email_verified_at ? 'Verificato' : 'Non verificato' }}
							</span>
						</div>
						<p class="mt-[4px] text-[0.8125rem] text-[#5F6C75] break-all">{{ u.email }}</p>
					</div>
				</div>

				<div class="mt-[12px] grid grid-cols-1 gap-[10px] text-[0.8125rem] tablet:grid-cols-2">
					<div class="rounded-[12px] bg-[#F8FAFB] px-[12px] py-[10px]">
						<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[#7B8791]">Telefono</p>
						<p class="mt-[4px] text-[#252B42]">{{ u.telephone_number || '\u2014' }}</p>
					</div>
					<div class="rounded-[12px] bg-[#F8FAFB] px-[12px] py-[10px]">
						<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[#7B8791]">Registrazione</p>
						<p class="mt-[4px] text-[#252B42]">{{ formatDate(u.created_at) }}</p>
					</div>
					<div class="rounded-[12px] bg-[#F8FAFB] px-[12px] py-[10px]">
						<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[#7B8791]">Ruolo attuale</p>
						<div class="mt-[4px]">
							<span :class="['px-[8px] py-[2px] rounded-full text-[0.625rem] font-semibold uppercase tracking-[0.5px]', (u.role || 'User') === 'Partner Pro' ? 'bg-blue-100 text-blue-700' : (u.role || 'User') === 'Admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600']">
								{{ (u.role || 'User') === 'Partner Pro' ? 'Partner Pro' : (u.role || 'User') === 'Admin' ? 'Admin' : 'Cliente' }}
							</span>
						</div>
					</div>
					<div class="rounded-[12px] bg-[#F8FAFB] px-[12px] py-[10px]">
						<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[#7B8791]">Referral</p>
						<p class="mt-[4px] break-all font-mono text-[0.75rem] text-[#252B42]">{{ u.referral_code || '\u2014' }}</p>
					</div>
				</div>

				<div class="mt-[12px] grid grid-cols-1 gap-[8px]">
					<select :value="u.role || 'User'" @change="emit('role-change', u, $event.target.value); $event.target.value = u.role || 'User'" :disabled="actionLoading === `role-${u.id}`" class="w-full px-[12px] py-[10px] rounded-[12px] bg-white border border-[#E0E6E8] text-[0.875rem] cursor-pointer focus:border-[#095866] focus:outline-none">
						<option value="User">Cliente</option>
						<option value="Partner Pro">Partner Pro</option>
						<option value="Admin">Admin</option>
					</select>
					<div class="grid grid-cols-2 gap-[8px]">
						<button v-if="!u.email_verified_at" @click="emit('approve', u.id)" :disabled="actionLoading === u.id" class="inline-flex min-h-[42px] items-center justify-center gap-[4px] px-[12px] py-[9px] rounded-[12px] bg-[#095866] text-white text-[0.8125rem] font-medium cursor-pointer disabled:opacity-60">
							Approva
						</button>
						<div v-else class="inline-flex min-h-[42px] items-center justify-center px-[12px] py-[9px] rounded-[12px] bg-emerald-50 text-emerald-700 text-[0.8125rem] font-medium">
							Verificato
						</div>
						<button @click="emit('delete', u)" :disabled="actionLoading === u.id" class="inline-flex min-h-[42px] items-center justify-center gap-[4px] px-[12px] py-[9px] rounded-[12px] bg-red-600 text-white text-[0.8125rem] font-medium cursor-pointer disabled:opacity-60">
							Elimina
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Desktop table -->
		<div class="hidden desktop:block overflow-x-auto">
			<table class="w-full text-[0.875rem]">
				<thead>
					<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
						<th class="pb-[12px] font-medium">Nome</th>
						<th class="pb-[12px] font-medium">Email</th>
						<th class="pb-[12px] font-medium">Telefono</th>
						<th class="pb-[12px] font-medium">Ruolo</th>
						<th class="pb-[12px] font-medium">Codice Ref.</th>
						<th class="pb-[12px] font-medium">Stato</th>
						<th class="pb-[12px] font-medium">Registrazione</th>
						<th class="pb-[12px] font-medium text-right">Azioni</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(u, idx) in users" :key="u.id" :class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
						<td class="py-[14px] text-[#252B42] font-medium">{{ u.name }} {{ u.surname }}</td>
						<td class="py-[14px] text-[#737373]">{{ u.email }}</td>
						<td class="py-[14px] text-[#737373] text-[0.8125rem]">{{ u.telephone_number || '\u2014' }}</td>
						<td class="py-[14px]">
							<select :value="u.role || 'User'" @change="emit('role-change', u, $event.target.value); $event.target.value = u.role || 'User'" :disabled="actionLoading === `role-${u.id}`" class="px-[8px] py-[4px] rounded-[6px] text-[0.75rem] font-medium border border-[#E9EBEC] cursor-pointer bg-white focus:border-[#095866] focus:outline-none">
								<option value="User">Cliente</option>
								<option value="Partner Pro">Partner Pro</option>
								<option value="Admin">Admin</option>
							</select>
						</td>
						<td class="py-[14px]">
							<span v-if="u.referral_code" class="font-mono text-[0.75rem] bg-[#F0F0F0] px-[6px] py-[2px] rounded">{{ u.referral_code }}</span>
							<span v-else class="text-[#C8CCD0]">&mdash;</span>
						</td>
						<td class="py-[14px]">
							<span :class="u.email_verified_at ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'" class="inline-flex items-center gap-[4px] px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium">
								<svg v-if="u.email_verified_at" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
								<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/></svg>
								{{ u.email_verified_at ? 'Verificato' : 'Non verificato' }}
							</span>
						</td>
						<td class="py-[14px] text-[#737373] text-[0.8125rem]">{{ formatDate(u.created_at) }}</td>
						<td class="py-[14px] text-right">
							<div class="flex justify-end gap-[6px]">
								<button v-if="!u.email_verified_at" @click="emit('approve', u.id)" :disabled="actionLoading === u.id" class="px-[10px] py-[6px] rounded-[12px] bg-[#095866] text-white text-[0.75rem] cursor-pointer disabled:opacity-60 flex items-center gap-[4px]">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg> Approva
								</button>
								<button @click="emit('delete', u)" :disabled="actionLoading === u.id" class="px-[10px] py-[6px] rounded-[12px] bg-red-600 text-white text-[0.75rem] cursor-pointer disabled:opacity-60 flex items-center gap-[4px]">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg> Elimina
								</button>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</template>
</template>
