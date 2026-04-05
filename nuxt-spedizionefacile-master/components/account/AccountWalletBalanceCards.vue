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
	<div class="rounded-[18px] border border-[#E9EBEC] bg-white px-[16px] py-[14px] shadow-sm desktop:px-[20px] desktop:py-[18px]">
		<div class="flex flex-col gap-[10px] tablet:flex-row tablet:items-start tablet:justify-between">
			<div>
				<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#095866]">Panoramica saldo</p>
				<h2 class="mt-[4px] text-[1rem] font-bold text-[#252B42]">Fondi disponibili e prossima azione</h2>
				<p class="mt-[4px] max-w-[640px] text-[0.8125rem] leading-[1.55] text-[#667281]">
					Tieni sotto controllo il denaro pronto all'uso, le commissioni Pro e i passaggi utili per ricaricare o prelevare senza aprire altre pagine.
				</p>
			</div>

			<span class="inline-flex w-fit items-center rounded-full bg-[#F0F6F7] px-[10px] py-[5px] text-[0.75rem] font-semibold text-[#095866]">
				{{ statusLabel }}
			</span>
		</div>

		<div
			v-if="balanceError"
			:class="[
				'mt-[12px] flex flex-col gap-[10px] rounded-[14px] border px-[12px] py-[11px] text-[0.8125rem] tablet:flex-row tablet:items-center tablet:justify-between',
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

		<div class="mt-[14px] grid gap-[12px] desktop:grid-cols-2">
			<section class="rounded-[16px] bg-[#FAFCFD] px-[16px] py-[15px]">
				<div class="mb-[12px] flex items-center gap-[8px]">
					<div class="flex h-[34px] w-[34px] items-center justify-center rounded-[50px] bg-[#EDF7F8]">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-[#095866]">
							<path
								d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round" />
							<path d="M21 12H10m11 0-3-3m3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</div>
					<p class="text-[0.75rem] font-medium uppercase tracking-[1.2px] text-[#095866]">Saldo disponibile</p>
				</div>

				<div v-if="isLoadingBalance && !hasBalanceData" class="animate-pulse space-y-[10px]">
					<div class="h-[16px] w-[110px] rounded-full bg-[#E9EBEC]"></div>
					<div class="h-[34px] w-[170px] rounded-[12px] bg-[#F5F7F8]"></div>
					<div class="h-[12px] w-[210px] rounded-full bg-[#E9EBEC]"></div>
				</div>

				<template v-else>
					<p class="text-[1.875rem] leading-none font-bold tracking-tight text-[#252B42] desktop:text-[2.25rem]">
						&euro;{{ balance ? formatEuro(balance.balance || 0) : '0,00' }}
					</p>
					<p class="mt-[8px] text-[0.8125rem] leading-[1.5] text-[#667281]">
						Importo subito utilizzabile per spedizioni, servizi e pagamenti dal wallet.
					</p>
					<div class="mt-[12px] flex flex-wrap gap-[8px]">
						<span class="inline-flex rounded-full bg-[#F0F6F7] px-[10px] py-[5px] text-[0.75rem] font-semibold text-[#095866]">
							Utilizzabile subito
						</span>
						<span class="inline-flex rounded-full bg-[#F8F9FB] px-[10px] py-[5px] text-[0.75rem] font-semibold text-[#4B5563]">
							{{ isPro ? 'Separato dalle commissioni' : 'Ricariche con carta predefinita' }}
						</span>
					</div>
				</template>
			</section>

			<section v-if="isPro" class="rounded-[16px] bg-[#F7FBFB] px-[16px] py-[15px]">
				<div class="mb-[12px] flex items-center gap-[8px]">
					<div class="flex h-[34px] w-[34px] items-center justify-center rounded-[50px] bg-[#EDF7F8]">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-[#095866]">
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
					<p class="text-[0.75rem] font-medium uppercase tracking-[1.2px] text-[#095866]">Commissioni Pro</p>
				</div>

				<div v-if="isLoadingBalance && !hasBalanceData" class="animate-pulse space-y-[10px]">
					<div class="h-[16px] w-[120px] rounded-full bg-[#E9EBEC]"></div>
					<div class="h-[34px] w-[160px] rounded-[12px] bg-[#F5F7F8]"></div>
					<div class="h-[12px] w-[200px] rounded-full bg-[#E9EBEC]"></div>
				</div>

				<template v-else>
					<p class="text-[1.875rem] leading-none font-bold tracking-tight text-[#252B42] desktop:text-[2.25rem]">
						&euro;{{ balance ? formatEuro(balance.commission_balance || 0) : '0,00' }}
					</p>
					<p class="mt-[8px] text-[0.8125rem] leading-[1.5] text-[#667281]">
						Resta separato dal wallet principale e lo puoi prelevare dalla sezione dedicata.
					</p>
					<NuxtLink to="/account/prelievi" class="btn-secondary btn-compact mt-[12px] inline-flex items-center gap-[6px]">
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

			<section v-else class="rounded-[16px] bg-[#FAFCFD] px-[16px] py-[15px]">
				<div class="flex items-start gap-[8px]">
					<div class="flex h-[34px] w-[34px] items-center justify-center rounded-[50px] bg-[#EDF7F8]">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#095866]">
							<rect x="1" y="4" width="22" height="16" rx="2" />
							<line x1="1" y1="10" x2="23" y2="10" />
						</svg>
					</div>
					<div class="min-w-0">
						<h3 class="text-[0.9375rem] font-bold text-[#252B42]">Azioni rapide</h3>
						<p class="mt-[4px] text-[0.8125rem] leading-[1.5] text-[#667281]">
							Ricarica il wallet o cambia carta senza rimbalzare tra schermate diverse.
						</p>
					</div>
				</div>

				<div class="mt-[14px] grid grid-cols-1 gap-[10px] tablet:grid-cols-2">
					<NuxtLink
						to="/account/carte"
						class="flex items-center gap-[8px] rounded-[14px] border border-[#E6EDF0] bg-white px-[12px] py-[12px] text-[0.8125rem] font-medium text-[#095866] transition-colors hover:border-[#BFD8DE] hover:text-[#0B6D7D]">
						<svg
							width="17"
							height="17"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="text-[#095866]">
							<rect x="1" y="4" width="22" height="16" rx="2" />
							<line x1="1" y1="10" x2="23" y2="10" />
						</svg>
						Gestisci carte
					</NuxtLink>

					<NuxtLink
						to="/account/spedizioni"
						class="flex items-center gap-[8px] rounded-[14px] border border-[#E6EDF0] bg-white px-[12px] py-[12px] text-[0.8125rem] font-medium text-[#095866] transition-colors hover:border-[#BFD8DE] hover:text-[#0B6D7D]">
						<svg
							width="17"
							height="17"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="text-[#095866]">
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

		<div class="mt-[14px] flex flex-col gap-[8px] tablet:flex-row tablet:items-center tablet:justify-between">
			<div>
				<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#095866]">Uso rapido</p>
				<p class="mt-[3px] text-[0.875rem] leading-[1.5] text-[#667281]">
					Le ricariche usano la carta predefinita; se cambi metodo, lo vedi subito nella prossima operazione.
				</p>
			</div>
			<NuxtLink to="/account/carte" class="btn-secondary btn-compact inline-flex items-center justify-center">Carte e pagamenti</NuxtLink>
		</div>
	</div>
</template>
