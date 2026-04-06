<!--
  FILE: components/account/AccountWalletBalanceCards.vue
  SCOPO: Mostra le card saldo principale e commissioni (Pro) o azioni rapide (non-Pro).
  PROPS: balance (Object|null), isPro (Boolean), isLoadingBalance (Boolean), balanceError (String).
-->
<script setup>
const props = defineProps({
	balance: { type: Object, default: null },
	isPro: { type: Boolean, default: false },
	isLoadingBalance: { type: Boolean, default: true },
	balanceError: { type: String, default: '' },
});

const emit = defineEmits(['retry-balance']);

const hasBalanceData = computed(() => props.balance?.balance != null || props.balance?.commission_balance != null);
const hasBlockingError = computed(() => Boolean(props.balanceError) && !hasBalanceData.value);
const hasStaleData = computed(() => Boolean(props.balanceError) && hasBalanceData.value);
const statusLabel = computed(() => {
	if (props.isLoadingBalance && !hasBalanceData.value) return 'Caricamento';
	if (hasBlockingError.value) return 'Da verificare';
	if (hasStaleData.value) return 'Ultimo dato disponibile';
	return 'Aggiornato';
});
</script>

<template>
	<div class="rounded-[20px] bg-white px-[20px] py-[20px]"
		style="box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);">
		<div
			v-if="balanceError"
			:class="[
				'mb-[16px] flex flex-col gap-[10px] rounded-[14px] border px-[12px] py-[11px] text-[0.8125rem] tablet:flex-row tablet:items-center tablet:justify-between',
				hasBlockingError ? 'border-[#F3C1C1] bg-[#FEF2F2] text-[#B42318]' : 'border-[#F3D1A7] bg-[#FFF7E8] text-[#B45309]',
			]">
			<p class="leading-[1.5]">
				{{
					hasBlockingError
						? balanceError
						: 'Non sono riuscito ad aggiornare il saldo in tempo reale. Ti mostro l ultimo valore disponibile.'
				}}
			</p>
			<button
				type="button"
				@click="emit('retry-balance')"
				class="btn-secondary btn-compact inline-flex items-center justify-center whitespace-nowrap">
				Riprova saldo
			</button>
		</div>

		<div class="grid gap-[16px] desktop:grid-cols-2">
			<!-- Balance card: gradient teal, testo bianco, importo grande -->
			<section class="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[var(--color-brand-primary)] via-[var(--color-brand-primary-hover)] to-[#0e8a9c] px-[20px] py-[24px] desktop:px-[24px] desktop:py-[24px]">
				<div class="absolute inset-0 opacity-[0.07]" style="background-image:radial-gradient(circle at 80% 20%, #fff 0%, transparent 60%)"></div>
				<div class="relative">
					<div class="mb-[16px] flex items-center gap-[8px]">
						<div class="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white/15">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-white">
								<path
									d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round" />
								<path d="M21 12H10m11 0-3-3m3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</div>
						<p class="text-[0.75rem] font-semibold uppercase tracking-[1.2px] text-white/80">Saldo disponibile</p>
					</div>

					<div v-if="isLoadingBalance && !hasBalanceData" class="animate-pulse space-y-[10px]">
						<div class="h-[16px] w-[110px] rounded-full bg-white/20"></div>
						<div class="h-[42px] w-[180px] rounded-[14px] bg-white/15"></div>
						<div class="h-[12px] w-[210px] rounded-full bg-white/15"></div>
					</div>

					<template v-else>
						<p class="text-[2.25rem] leading-none font-bold tracking-tight text-white desktop:text-[2.75rem]">
							&euro;{{ balance ? formatEuro(balance.balance || 0) : '0,00' }}
						</p>
						<p class="mt-[10px] text-[0.8125rem] leading-[1.5] text-white/70">
							Importo subito utilizzabile per spedizioni, servizi e pagamenti dal wallet.
						</p>
						<div class="mt-[14px] flex flex-wrap gap-[8px]">
							<span class="inline-flex rounded-full bg-white/15 px-[10px] py-[5px] text-[0.75rem] font-semibold text-white">
								Utilizzabile subito
							</span>
							<span class="inline-flex rounded-full bg-white/10 px-[10px] py-[5px] text-[0.75rem] font-semibold text-white/80">
								{{ isPro ? 'Separato dalle commissioni' : 'Ricariche con carta predefinita' }}
							</span>
						</div>
					</template>
				</div>
			</section>

			<section v-if="isPro" class="rounded-[20px] bg-[#F4FBF6] px-[20px] py-[24px] desktop:px-[24px] desktop:py-[24px]">
				<div class="mb-[16px] flex items-center gap-[8px]">
					<div class="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#E0F5E7]">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-[#15803D]">
							<path
								d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round" />
							<path d="M6 20v-2a4 4 0 0 1 4-4h.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
							<path
								d="M16 16h2m0 0h2m-2 0v-2m0 2v2"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round" />
						</svg>
					</div>
					<p class="text-[0.75rem] font-semibold uppercase tracking-[1.2px] text-[#15803D]">Commissioni Pro</p>
				</div>

				<div v-if="isLoadingBalance && !hasBalanceData" class="animate-pulse space-y-[10px]">
					<div class="h-[16px] w-[120px] rounded-full bg-[#D1FAE5]"></div>
					<div class="h-[34px] w-[160px] rounded-[14px] bg-[#D1FAE5]"></div>
					<div class="h-[12px] w-[200px] rounded-full bg-[#D1FAE5]"></div>
				</div>

				<template v-else>
					<p class="text-[2rem] leading-none font-bold tracking-tight text-[var(--color-brand-text)] desktop:text-[2.25rem]">
						&euro;{{ balance ? formatEuro(balance.commission_balance || 0) : '0,00' }}
					</p>
					<p class="mt-[10px] text-[0.8125rem] leading-[1.5] text-[var(--color-brand-text-secondary)]">
						Resta separato dal wallet principale e lo puoi prelevare dalla sezione dedicata.
					</p>
					<NuxtLink to="/account/prelievi" class="btn-secondary btn-compact mt-[14px] inline-flex items-center gap-[6px]">
						Richiedi prelievo
						<svg
							width="15"
							height="15"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round">
							<path d="M5 12h14M12 5l7 7-7 7" />
						</svg>
					</NuxtLink>
				</template>
			</section>

			<section v-else class="rounded-[20px] bg-[#FAFCFD] px-[20px] py-[24px] desktop:px-[24px] desktop:py-[24px]">
				<div class="flex items-start gap-[10px]">
					<div class="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#EDF7F8]">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--color-brand-primary)]">
							<rect x="1" y="4" width="22" height="16" rx="2" />
							<line x1="1" y1="10" x2="23" y2="10" />
						</svg>
					</div>
					<div class="min-w-0">
						<h3 class="font-montserrat text-[0.9375rem] font-[800] text-[var(--color-brand-text)]">Azioni rapide</h3>
						<p class="mt-[4px] text-[0.8125rem] leading-[1.5] text-[var(--color-brand-text-secondary)]">
							Ricarica il wallet o cambia carta senza rimbalzare tra schermate diverse.
						</p>
					</div>
				</div>

				<div class="mt-[14px] grid grid-cols-1 gap-[10px] tablet:grid-cols-2">
					<NuxtLink
						to="/account/carte"
						class="flex items-center gap-[8px] rounded-[16px] border border-[#E6EDF0] bg-white px-[14px] py-[13px] text-[0.8125rem] font-medium text-[var(--color-brand-primary)] transition-colors hover:border-[#BFD8DE] hover:text-[var(--color-brand-primary)]">
						<svg
							width="17"
							height="17"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="text-[var(--color-brand-primary)]">
							<rect x="1" y="4" width="22" height="16" rx="2" />
							<line x1="1" y1="10" x2="23" y2="10" />
						</svg>
						Gestisci carte
					</NuxtLink>

					<NuxtLink
						to="/account/spedizioni"
						class="flex items-center gap-[8px] rounded-[16px] border border-[#E6EDF0] bg-white px-[14px] py-[13px] text-[0.8125rem] font-medium text-[var(--color-brand-primary)] transition-colors hover:border-[#BFD8DE] hover:text-[var(--color-brand-primary)]">
						<svg
							width="17"
							height="17"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="text-[var(--color-brand-primary)]">
							<path d="M1 3h15v13H1z" />
							<path d="M16 8h4l3 3v5h-7V8z" />
							<circle cx="5.5" cy="18.5" r="2.5" />
							<circle cx="18.5" cy="18.5" r="2.5" />
						</svg>
						Le tue spedizioni
					</NuxtLink>
				</div>
			</section>
		</div>

		<div class="mt-[14px] flex flex-col gap-[10px] rounded-[12px] bg-[#F5F6F9] px-[14px] py-[12px] tablet:flex-row tablet:items-center tablet:justify-between">
			<div>
				<span class="text-[var(--color-brand-text)] text-[13px] font-[600]">Uso rapido</span>
				<span class="text-[var(--color-brand-text-muted)] text-[12px] ml-[6px]">Ricariche con carta predefinita</span>
			</div>
			<NuxtLink to="/account/carte"
				class="h-[34px] px-[14px] rounded-[10px] bg-[#095866] text-white text-[12px] font-[600] flex items-center gap-[5px] cursor-pointer hover:bg-[#074a56] transition-colors whitespace-nowrap">
				Carte e pagamenti
			</NuxtLink>
		</div>
	</div>
</template>
