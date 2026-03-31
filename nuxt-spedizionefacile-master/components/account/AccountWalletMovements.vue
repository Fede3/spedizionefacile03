<!--
  FILE: components/account/AccountWalletMovements.vue
  SCOPO: Storico movimenti del portafoglio — lista cronologica con icona, fonte, importo.
  PROPS: movements (Array), isLoadingMovements (Boolean).
-->
<script setup>
defineProps({
  movements: { type: Array, default: () => [] },
  isLoadingMovements: { type: Boolean, default: true },
});

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getMovementColor = (mov) => {
  return mov.type === "credit" ? "text-[#095866]" : "text-[#b42318]";
};

const getMovementSign = (mov) => {
  return mov.type === "credit" ? "+" : "-";
};

const getSourceLabel = (source) => {
  const labels = {
    stripe: "Carta",
    commission: "Commissione",
    withdrawal: "Prelievo",
    wallet: "Portafoglio",
    refund: "Rimborso",
  };
  return labels[source] || source || "\u2014";
};

const getSourceColor = (source) => {
  const colors = {
    stripe: "bg-[#edf7f8] text-[#095866]",
    commission: "bg-[#fff4e8] text-[#b45309]",
    withdrawal: "bg-[#f5f7f8] text-[#4b5563]",
    wallet: "bg-[#edf7f8] text-[#095866]",
    refund: "bg-[#fef2f2] text-[#b42318]",
  };
  return colors[source] || "bg-gray-50 text-gray-600";
};

/* SVG icons per source: returns { viewBox, d } for the movement icon */
const getMovementSvg = (mov) => {
  if (mov.source === "commission") return "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM6 20v-2a4 4 0 0 1 4-4h.5M16 16h2m0 0h2m-2 0v-2m0 2v2";
  if (mov.source === "withdrawal") return "M3 6h18M3 12h18M3 18h18M17 6l3 3-3 3";
  if (mov.source === "wallet") return "M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1";
  if (mov.source === "refund") return "M3 10h4l3 8 4-16 3 8h4";
  if (mov.source === "stripe") {
    return mov.type === "credit"
      ? "M1 4h22v16H1zM1 10h22M12 14h4"
      : "M1 4h22v16H1zM1 10h22M10 14h4";
  }
  return "M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4";
};
</script>

<template>
  <div class="mt-[20px] rounded-[20px] border border-[#E9EBEC] bg-white p-[16px] shadow-sm desktop:mt-[24px] desktop:p-[24px]">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-[10px] sm:gap-[14px] mb-[14px] desktop:mb-[18px]">
      <div class="flex items-center gap-[12px]">
        <div class="w-[36px] h-[36px] rounded-[50px] bg-[#edf7f8] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#095866]"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
        </div>
        <h2 class="text-[1rem] font-bold text-[#252B42]">Movimenti</h2>
      </div>
      <span v-if="movements?.length" class="text-[0.8125rem] text-[#737373] bg-[#F0F0F0] px-[10px] py-[4px] rounded-full">
        {{ movements.length }} {{ movements.length === 1 ? 'movimento' : 'movimenti' }}
      </span>
    </div>

    <div v-if="isLoadingMovements" class="py-[24px] flex justify-center">
      <div class="w-[30px] h-[30px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
    </div>

    <div v-else-if="!movements?.length" class="text-center py-[32px]">
      <div class="w-[56px] h-[56px] mx-auto mb-[14px] rounded-full bg-[#F8F9FB] flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#C8CCD0]"><path d="M4 4h16v16H4z"/><path d="M4 10h16"/><path d="M10 4v16"/></svg>
      </div>
      <p class="text-[0.9375rem] font-medium text-[#252B42]">Nessun movimento</p>
      <p class="text-[0.8125rem] text-[#737373] mt-[6px] max-w-[360px] mx-auto leading-[1.55]">I movimenti appariranno qui dopo la prima ricarica o il primo pagamento con il portafoglio.</p>
      <NuxtLink to="/preventivo" class="inline-flex items-center gap-[6px] mt-[16px] px-[20px] py-[10px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] font-semibold text-[0.875rem] transition-colors">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Crea la tua prima spedizione
      </NuxtLink>
    </div>

    <ul v-else class="space-y-[8px]">
      <li v-for="mov in movements" :key="mov.id" class="flex flex-col sm:flex-row sm:items-center gap-[10px] sm:gap-[12px] p-[12px] rounded-[14px] border border-[#EEF1F3] hover:bg-[#F8F9FB] transition-colors">
        <div :class="['w-[38px] h-[38px] rounded-[50px] flex items-center justify-center shrink-0', mov.type === 'credit' ? 'bg-[#edf7f8]' : 'bg-[#fef2f2]']">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="mov.type === 'credit' ? 'text-[#095866]' : 'text-[#b42318]'">
            <path :d="getMovementSvg(mov)" />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-[0.875rem] font-medium text-[#252B42] truncate">{{ mov.description }}</p>
          <div class="flex items-center gap-[8px] mt-[4px]">
            <span class="text-[0.75rem] text-[#737373]">{{ formatDate(mov.created_at) }}</span>
            <span :class="['text-[0.6875rem] px-[8px] py-[2px] rounded-full font-medium', getSourceColor(mov.source)]">{{ getSourceLabel(mov.source) }}</span>
          </div>
        </div>
        <span :class="['text-[0.9375rem] font-bold tabular-nums whitespace-nowrap self-start sm:self-auto', getMovementColor(mov)]">
          {{ getMovementSign(mov) }}&euro;{{ Number(mov.amount).toFixed(2) }}
        </span>
      </li>
    </ul>
  </div>
</template>
