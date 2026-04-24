<!-- FILE: components/wallet/WalletTopUpModal.vue -->
<script setup>
import { formatEuro } from '~/utils/price.js';

const props = defineProps({
	open: { type: Boolean, default: false },
	defaultPaymentMethod: { type: Object, default: () => null },
	stripeConfigured: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'success', 'paymentMethodUpdated']);

const presetAmounts = [10, 25, 50, 100];
const COMMISSION_RATE = 0; /* nessuna commissione applicata oggi */

const {
	topUpAmount,
	isLoading,
	message,
	messageType,
	showNewCardForm,
	isPreparingNewCardForm,
	cardHolderName,
	cardError,
	canSubmitTopUp,
	topUpButtonLabel,
	handleTopUp,
	openNewCardForm,
	closeNewCardForm,
} = useWalletTopUp(props, (event, ...args) => {
	if (event === 'topUpSuccess') emit('success');
	else if (event === 'paymentMethodUpdated') emit('paymentMethodUpdated', ...args);
});

const formatCardBrand = (brand) => {
	const v = String(brand || '').trim();
	if (!v) return 'Carta';
	return v.charAt(0).toUpperCase() + v.slice(1);
};

const cardLabel = computed(() => {
	if (props.defaultPaymentMethod?.card) {
		return `${formatCardBrand(props.defaultPaymentMethod.card.brand)} \u2022\u2022\u2022\u2022 ${props.defaultPaymentMethod.card.last4}`;
	}
	return null;
});

const amountNumber = computed(() => Number(topUpAmount.value) || 0);
const commission = computed(() => Number((amountNumber.value * COMMISSION_RATE).toFixed(2)));
const total = computed(() => Number((amountNumber.value + commission.value).toFixed(2)));

const selectPresetLocal = (n) => {
	topUpAmount.value = n;
};

const close = () => {
	if (isLoading.value) return;
	emit('close');
};

/* Lock scroll quando aperto + ESC per chiudere */
watch(
	() => props.open,
	(isOpen) => {
		if (typeof document === 'undefined') return;
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	},
);

const onKey = (e) => {
	if (e.key === 'Escape' && props.open) close();
};

onMounted(() => {
	if (typeof window !== 'undefined') window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
	if (typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
	if (typeof document !== 'undefined') document.body.style.overflow = '';
});
</script>

<template>
	<Teleport to="body">
		<Transition name="sf-wallet-modal">
			<div
				v-if="open"
				class="fixed inset-0 z-[1100] flex items-end justify-center bg-black/55 backdrop-blur-sm tablet:items-center"
				role="dialog"
				aria-modal="true"
				aria-labelledby="wallet-topup-title"
				@click.self="close">
				<div
					class="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl tablet:max-w-[520px] tablet:rounded-[24px]">
					<!-- Header -->
					<header class="relative border-b border-[var(--color-brand-border)] px-[22px] py-[18px]">
						<p class="text-[11px] font-[700] uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
							Wallet
						</p>
						<h2
							id="wallet-topup-title"
							class="mt-[2px] text-[1.25rem] font-[800] leading-[1.2] text-[var(--color-brand-text)]">
							Ricarica il portafoglio
						</h2>
						<button
							type="button"
							class="absolute right-[14px] top-[14px] inline-flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[var(--color-brand-bg-alt)] text-[var(--color-brand-text)] hover:bg-[var(--color-brand-border)] transition-colors"
							:disabled="isLoading"
							aria-label="Chiudi"
							@click="close">
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.4"
								stroke-linecap="round"
								stroke-linejoin="round">
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</header>

					<!-- Body scrollable -->
					<div class="flex-1 overflow-y-auto px-[22px] py-[20px]">
						<!-- Stripe non configurato -->
						<div
							v-if="!stripeConfigured"
							class="mb-[16px] rounded-[14px] border border-[#fde68a] bg-[#fffbeb] p-[14px] text-[13px] text-[#92400e]">
							Le ricariche con carta non sono ancora attive su questo sito. Prova piu' tardi.
						</div>

						<!-- Importo -->
						<div class="mb-[18px]">
							<label
								for="wallet-topup-amount"
								class="mb-[8px] block text-[13px] font-[700] text-[var(--color-brand-text)]">
								Importo da ricaricare
							</label>
							<div class="relative">
								<span
									class="pointer-events-none absolute left-[16px] top-1/2 -translate-y-1/2 text-[16px] font-[700] text-[var(--color-brand-text-muted)]"
									aria-hidden="true">&#8364;</span>
								<input
									id="wallet-topup-amount"
									v-model="topUpAmount"
									type="number"
									inputmode="decimal"
									min="1"
									step="0.01"
									placeholder="0,00"
									class="h-[52px] w-full rounded-[14px] border border-[var(--color-brand-border)] bg-white pl-[36px] pr-[14px] text-[18px] font-[700] text-[var(--color-brand-text)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/20" />
							</div>

							<!-- Shortcut -->
							<div class="mt-[10px] grid grid-cols-4 gap-[8px]">
								<button
									v-for="n in presetAmounts"
									:key="n"
									type="button"
									class="h-[40px] rounded-full border text-[13px] font-[700] transition-colors"
									:class="
										Number(topUpAmount) === n
											? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white'
											: 'border-[var(--color-brand-border)] bg-white text-[var(--color-brand-text)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]'
									"
									@click="selectPresetLocal(n)">
									&#8364;{{ n }}
								</button>
							</div>
						</div>

						<!-- Riepilogo -->
						<div
							v-if="amountNumber > 0"
							class="mb-[18px] rounded-[14px] border border-[var(--color-brand-border)] bg-[var(--color-brand-bg-alt)] p-[14px]">
							<dl class="space-y-[6px] text-[13px]">
								<div class="flex justify-between">
									<dt class="text-[var(--color-brand-text-secondary)]">Importo</dt>
									<dd class="font-[700] text-[var(--color-brand-text)]">
										&#8364;{{ formatEuro(amountNumber) }}
									</dd>
								</div>
								<div class="flex justify-between">
									<dt class="text-[var(--color-brand-text-secondary)]">Commissione</dt>
									<dd class="font-[700] text-[var(--color-brand-text)]">
										{{ commission > 0 ? `\u20AC${formatEuro(commission)}` : 'Gratis' }}
									</dd>
								</div>
								<div class="border-t border-[var(--color-brand-border)] pt-[6px] flex justify-between">
									<dt class="font-[700] text-[var(--color-brand-text)]">Totale addebito</dt>
									<dd class="text-[15px] font-[800] text-[var(--color-brand-primary)]">
										&#8364;{{ formatEuro(total) }}
									</dd>
								</div>
							</dl>
						</div>

						<!-- Carta predefinita o aggiungi -->
						<div class="mb-[14px]">
							<p class="mb-[8px] text-[13px] font-[700] text-[var(--color-brand-text)]">
								Metodo di pagamento
							</p>
							<div
								v-if="cardLabel && !showNewCardForm"
								class="flex items-center justify-between rounded-[14px] border border-[var(--color-brand-border)] bg-white p-[12px]">
								<div class="flex items-center gap-[10px]">
									<span
										class="inline-flex h-[34px] w-[44px] items-center justify-center rounded-[6px] bg-[var(--color-brand-bg-alt)] text-[11px] font-[800] text-[var(--color-brand-text)]">
										CARD
									</span>
									<p class="text-[13px] font-[700] text-[var(--color-brand-text)]">
										{{ cardLabel }}
									</p>
								</div>
								<button
									type="button"
									class="text-[12px] font-[700] text-[var(--color-brand-primary)] hover:underline"
									@click="openNewCardForm">
									Cambia
								</button>
							</div>

							<button
								v-else-if="!showNewCardForm"
								type="button"
								class="btn-secondary w-full justify-center"
								:disabled="!stripeConfigured"
								@click="openNewCardForm">
								Aggiungi una carta
							</button>

							<!-- Form Stripe Elements -->
							<div v-if="showNewCardForm" class="space-y-[10px]">
								<div v-if="isPreparingNewCardForm" class="text-[12px] text-[var(--color-brand-text-muted)]">
									Preparazione modulo carta...
								</div>

								<label class="block">
									<span class="mb-[4px] block text-[12px] font-[700] text-[var(--color-brand-text)]">
										Titolare
									</span>
									<input
										v-model="cardHolderName"
										type="text"
										placeholder="Nome Cognome"
										class="h-[44px] w-full rounded-[12px] border border-[var(--color-brand-border)] bg-white px-[12px] text-[14px] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/20" />
								</label>

								<label class="block">
									<span class="mb-[4px] block text-[12px] font-[700] text-[var(--color-brand-text)]">
										Numero carta
									</span>
									<div
										id="wallet-card-number"
										class="h-[44px] rounded-[12px] border border-[var(--color-brand-border)] bg-white px-[12px] py-[12px]"></div>
								</label>

								<div class="grid grid-cols-2 gap-[10px]">
									<label class="block">
										<span class="mb-[4px] block text-[12px] font-[700] text-[var(--color-brand-text)]">
											Scadenza
										</span>
										<div
											id="wallet-card-expiry"
											class="h-[44px] rounded-[12px] border border-[var(--color-brand-border)] bg-white px-[12px] py-[12px]"></div>
									</label>
									<label class="block">
										<span class="mb-[4px] block text-[12px] font-[700] text-[var(--color-brand-text)]">
											CVC
										</span>
										<div
											id="wallet-card-cvc"
											class="h-[44px] rounded-[12px] border border-[var(--color-brand-border)] bg-white px-[12px] py-[12px]"></div>
									</label>
								</div>

								<div v-if="cardError" class="text-[12px] font-[600] text-[#dc2626]">
									{{ cardError }}
								</div>

								<button
									type="button"
									class="text-[12px] font-[700] text-[var(--color-brand-text-muted)] hover:underline"
									@click="closeNewCardForm">
									Annulla nuova carta
								</button>
							</div>
						</div>

						<!-- Feedback -->
						<div
							v-if="message"
							class="rounded-[12px] p-[12px] text-[13px] font-[600]"
							:class="
								messageType === 'success'
									? 'bg-[#e7f5f1] text-[#0a8a7a]'
									: 'bg-[#fef2f2] text-[#b91c1c]'
							">
							{{ message }}
						</div>
					</div>

					<!-- Footer -->
					<footer
						class="border-t border-[var(--color-brand-border)] bg-white px-[22px] py-[16px]">
						<button
							type="button"
							class="btn-cta btn-lg w-full justify-center"
							:disabled="!canSubmitTopUp"
							@click="handleTopUp">
							{{ topUpButtonLabel }}
						</button>
						<p class="mt-[8px] text-center text-[11px] text-[var(--color-brand-text-muted)]">
							Pagamenti sicuri via Stripe &#8226; PCI-DSS Level 1
						</p>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.sf-wallet-modal-enter-active,
.sf-wallet-modal-leave-active {
	transition: opacity 220ms ease;
}
.sf-wallet-modal-enter-active > div,
.sf-wallet-modal-leave-active > div {
	transition: transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.sf-wallet-modal-enter-from,
.sf-wallet-modal-leave-to {
	opacity: 0;
}
.sf-wallet-modal-enter-from > div,
.sf-wallet-modal-leave-to > div {
	transform: translateY(24px);
}
</style>
