<!--
  FILE: components/account/AccountWalletBalanceCards.vue
  SCOPO: Mostra le card saldo principale e commissioni (Pro) o azioni rapide (non-Pro).
  PROPS: balance (Object|null), isPro (Boolean), isLoadingBalance (Boolean).
-->
<script setup>
defineProps({
  balance: { type: Object, default: null },
  isPro: { type: Boolean, default: false },
  isLoadingBalance: { type: Boolean, default: true },
});
</script>

<template>
  <div class="space-y-[12px] desktop:space-y-[14px]">
    <!-- Balance Cards Row -->
    <div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px]">
      <!-- Main Balance -->
      <div class="rounded-[18px] border border-[#E5EDF2] bg-white p-[18px] shadow-sm desktop:p-[22px]">
        <div class="flex items-center gap-[8px] mb-[14px]">
          <div class="w-[36px] h-[36px] rounded-[50px] bg-[#edf7f8] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-[#095866]">
              <path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M21 12H10m11 0-3-3m3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <p class="text-[0.75rem] uppercase tracking-[1.2px] font-medium text-[#095866]">Saldo disponibile</p>
        </div>
        <p class="text-[1.875rem] desktop:text-[2.25rem] font-bold tracking-tight leading-none text-[#252B42]">
          &euro;{{ balance ? formatEuro(balance.balance) : "0,00" }}
        </p>
        <p class="text-[0.75rem] text-[#667281] mt-[6px]">Saldo principale del wallet.</p>
      </div>

      <!-- Commission Balance (Pro users) -->
      <div v-if="isPro" class="rounded-[18px] border border-[#E5EDF2] bg-[#fbfcfd] p-[18px] shadow-sm desktop:p-[22px]">
        <div class="flex items-center gap-[8px] mb-[14px]">
          <div class="w-[36px] h-[36px] rounded-[50px] bg-[#edf7f8] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-[#095866]">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M6 20v-2a4 4 0 0 1 4-4h.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 16h2m0 0h2m-2 0v-2m0 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <p class="text-[0.75rem] uppercase tracking-[1.2px] font-medium text-[#095866]">Commissioni</p>
        </div>
        <p class="text-[1.875rem] desktop:text-[2.25rem] font-bold tracking-tight leading-none text-[#252B42]">
          &euro;{{ balance ? formatEuro(balance.commission_balance || 0) : "0,00" }}
        </p>
        <NuxtLink to="/account/prelievi" class="mt-[10px] inline-flex items-center gap-[6px] rounded-[999px] border border-[#D7E6E9] bg-white px-[12px] py-[8px] text-[0.75rem] font-semibold text-[#095866] transition-colors hover:border-[#BFD8DE] hover:bg-[#f7fbfc]">
          Richiedi prelievo
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </NuxtLink>
      </div>

      <!-- Non-Pro: Quick actions -->
      <div v-else class="flex flex-col justify-between rounded-[18px] border border-[#E9EBEC] bg-white p-[18px] shadow-sm desktop:p-[22px]">
        <div>
          <h3 class="text-[0.9375rem] font-bold text-[#252B42] mb-[6px]">Azioni rapide</h3>
          <p class="text-[0.75rem] text-[#667281] leading-[1.45]">Carte e spedizioni salvate.</p>
        </div>
        <div class="mt-[14px] grid grid-cols-1 gap-[10px] tablet:grid-cols-2">
          <NuxtLink to="/account/carte" class="flex items-center gap-[8px] rounded-[14px] border border-[#E6EDF0] bg-[#FAFCFD] px-[12px] py-[12px] text-[0.8125rem] font-medium text-[#095866] hover:text-[#0b6d7d] hover:border-[#BFD8DE] transition-colors">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#095866]"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Gestisci carte
          </NuxtLink>
          <NuxtLink to="/account/spedizioni" class="flex items-center gap-[8px] rounded-[14px] border border-[#E6EDF0] bg-[#FAFCFD] px-[12px] py-[12px] text-[0.8125rem] font-medium text-[#095866] hover:text-[#0b6d7d] hover:border-[#BFD8DE] transition-colors">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#095866]"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Le tue spedizioni
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="rounded-[18px] border border-[#E9EBEC] bg-white px-[16px] py-[14px] shadow-sm desktop:px-[18px] desktop:py-[16px]">
      <div class="flex flex-col gap-[8px] tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#095866]">Uso rapido</p>
          <p class="mt-[3px] text-[0.875rem] leading-[1.5] text-[#667281]">Usa la carta salvata o cambia metodo.</p>
        </div>
        <NuxtLink to="/account/carte" class="btn-secondary btn-compact inline-flex items-center justify-center">
          Carte e pagamenti
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
