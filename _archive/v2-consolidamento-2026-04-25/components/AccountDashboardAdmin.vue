<script setup>
import '~/assets/css/components/sf-account-dashboard-admin.css';
import { accountCardIcons } from '~/utils/account';

defineProps({
	adminAlerts: { type: Array, default: () => [] },
	adminKpis: { type: Array, default: () => [] },
	adminRecentItems: { type: Array, default: () => [] },
	adminDashboardError: { type: String, default: '' },
	isLoggingOut: { type: Boolean, default: false },
});

const emit = defineEmits(['logout']);
const handleLogout = () => emit('logout');
</script>

<template>
	<div class="sf-account-admin-stack">
		<AccountPageHeader
			class="sf-account-shell-hero--compact"
			:crumbs="[]"
			title="Il tuo account"
			description="Priorita operative e attivita recenti in una vista piu pulita.">
			<template #actions>
				<div class="sf-admin-root__actions flex flex-wrap justify-end gap-[12px]">
					<NuxtLink
						to="/preventivo"
						class="btn-primary btn-compact inline-flex min-w-[180px] items-center justify-center gap-[8px]">
						<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						Nuova spedizione
					</NuxtLink>

					<button
						type="button"
						@click="handleLogout"
						:disabled="isLoggingOut"
						class="btn-secondary btn-compact inline-flex min-w-[118px] items-center justify-center gap-[8px]">
						<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
							<polyline points="16 17 21 12 16 7" />
							<line x1="21" y1="12" x2="9" y2="12" />
						</svg>
						{{ isLoggingOut ? 'Uscita...' : 'Esci' }}
					</button>
				</div>
			</template>
		</AccountPageHeader>

		<div class="sf-shell-card sf-admin-root__priority-card sf-animate-in sf-animate-in-1">
			<div class="mb-[16px] flex flex-wrap items-start justify-between gap-[12px]">
				<div>
					<p class="sf-section-kicker mb-[6px]">Attenzione</p>
					<h2 class="sf-section-title">Notifiche operative</h2>
				</div>

				<span
					class="inline-flex items-center rounded-full px-[10px] py-[4px] text-[0.72rem]"
					style="font-weight:700; background:rgba(228,66,3,0.08); color:#E44203;">
					{{ adminAlerts.length }} {{ adminAlerts.length === 1 ? 'priorita' : 'priorita' }}
				</span>
			</div>

			<div v-if="adminDashboardError" class="mb-[14px] rounded-[12px] border border-[rgba(228,66,3,0.16)] bg-[rgba(255,244,238,0.86)] px-[14px] py-[12px] text-[0.86rem] text-[#9A3412]">
				{{ adminDashboardError }}
			</div>

			<div class="sf-admin-root__attention-list grid gap-[10px]">
				<NuxtLink
					v-for="item in adminAlerts"
					:key="item.url"
					:to="item.url"
					class="sf-admin-root__attention-item group flex items-center gap-[14px] rounded-[16px] px-[16px] py-[16px] transition-all hover:bg-[rgba(255,248,245,0.96)]">
					<div
						class="sf-admin-root__attention-icon flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[13px]"
						:style="{ background: item.iconBg, color: item.iconColor }">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="h-[16px] w-[16px]" v-html="accountCardIcons[item.iconKey]" />
					</div>

					<div class="min-w-0 flex-1">
						<p class="text-[0.95rem] leading-[1.32] text-[var(--color-brand-text)]" style="font-weight:700;">
							{{ item.label }}
						</p>
						<p class="mt-[5px] text-[0.84rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">
							{{ item.meta }}
						</p>
					</div>

					<span class="inline-flex items-center gap-[7px] text-[0.84rem] font-[700] text-[var(--color-brand-primary)] opacity-[0.78] transition-all group-hover:gap-[9px] group-hover:opacity-100">
						{{ item.action }}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M5 12h14M12 5l7 7-7 7" />
						</svg>
					</span>
				</NuxtLink>
			</div>
		</div>

		<div class="sf-admin-root__kpi-grid sf-animate-in sf-animate-in-2 grid grid-cols-2 gap-[12px] desktop:grid-cols-4">
			<NuxtLink
				v-for="metric in adminKpis"
				:key="metric.key"
				:to="metric.url"
				class="sf-admin-root__kpi-card group rounded-[18px] bg-white px-[20px] py-[20px] text-left transition-all hover:-translate-y-[2px]"
				:style="{ boxShadow: 'var(--sf-shell-shadow)' }">
				<div class="mb-[14px] flex items-center justify-between">
					<div
						class="sf-admin-root__kpi-icon flex h-[38px] w-[38px] items-center justify-center rounded-[12px]"
						:style="{ background: metric.iconBg, color: metric.iconColor }">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="h-[15px] w-[15px]" v-html="accountCardIcons[metric.iconKey]" />
					</div>
					<svg class="text-[#D6DCE3] transition-colors group-hover:text-[var(--color-brand-primary)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M9 18l6-6-6-6" />
					</svg>
				</div>

				<p class="text-[1.65rem] leading-[1] tracking-[-0.04em] text-[var(--color-brand-text)] sm:text-[1.85rem]" style="font-weight:800;">
					{{ metric.value }}
				</p>
				<p class="mt-[8px] text-[0.79rem] uppercase tracking-[0.12em] text-[var(--color-brand-text-secondary)]" style="font-weight:700;">
					{{ metric.label }}
				</p>
				<p class="mt-[6px] text-[0.82rem] leading-[1.5] text-[var(--color-brand-text-secondary)]">
					{{ metric.meta }}
				</p>
			</NuxtLink>
		</div>

		<div class="sf-shell-card sf-admin-root__activity-card sf-animate-in sf-animate-in-3">
			<div class="mb-[18px] flex flex-wrap items-start justify-between gap-[12px]">
				<div>
					<p class="sf-section-kicker mb-[6px]">Attivita recente</p>
					<h2 class="sf-section-title">Ultimi aggiornamenti della piattaforma</h2>
					<p class="sf-section-description mt-[6px]">
						Ordini e stati recenti in un feed piu leggibile, con blocchi piu curati, hover coerente e dettaglio immediato.
					</p>
				</div>

				<NuxtLink
					to="/account/amministrazione"
					class="inline-flex items-center gap-[7px] text-[0.84rem] text-[var(--color-brand-primary)]"
					style="font-weight:700;">
					Apri console completa
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M9 18l6-6-6-6" />
					</svg>
				</NuxtLink>
			</div>

			<div class="sf-admin-root__activity-list grid gap-[12px]">
				<NuxtLink
					v-for="item in adminRecentItems"
					:key="item.id"
					:to="item.url"
					class="sf-admin-root__activity-item group flex items-start gap-[14px] rounded-[16px] border border-[rgba(9,88,102,0.08)] bg-[rgba(248,251,252,0.88)] px-[18px] py-[18px] transition-all hover:-translate-y-[1px] hover:border-[rgba(9,88,102,0.14)]">
					<div
						class="sf-admin-root__activity-icon flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[13px]"
						style="background:rgba(9,88,102,0.08); color:#095866;">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="h-[16px] w-[16px]" v-html="accountCardIcons.package" />
					</div>

					<div class="min-w-0 flex-1">
						<p class="text-[0.95rem] leading-[1.3] text-[var(--color-brand-text)]" style="font-weight:700;">
							{{ item.title }}
						</p>
						<p class="mt-[6px] text-[0.83rem] leading-[1.52] text-[var(--color-brand-text-secondary)]">
							{{ item.meta }}
						</p>
					</div>

					<span
						class="inline-flex shrink-0 items-center rounded-full px-[10px] py-[4px] text-[0.72rem]"
						:style="{ background: item.statusTone.bg, color: item.statusTone.color, fontWeight: 700 }">
						{{ item.statusLabel }}
					</span>
				</NuxtLink>
			</div>
		</div>
	</div>
</template>

