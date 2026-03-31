<script setup>
const error = useError();
const statusCode = error.value?.statusCode || 500;
const is404 = statusCode === 404;

const handleBack = () => clearError({ redirect: '/' });
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#F8F9FB] px-[16px]">
    <div class="bg-white border border-[#E9EBEC] rounded-[12px] shadow-lg p-[32px] max-w-[420px] w-full text-center">
      <div class="flex justify-center mb-[16px]">
        <svg v-if="is404" xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M16 16s-1.5-2-4-2-4 2-4 2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <p class="text-[2.5rem] font-bold text-[#095866] mb-[4px]">{{ statusCode }}</p>
      <h1 class="text-[1.125rem] font-semibold text-[#252B42] mb-[8px]">
        {{ is404 ? 'Pagina non trovata' : 'Errore del server' }}
      </h1>
      <p class="text-[0.875rem] text-[#737373] mb-[24px]">
        {{ is404 ? 'La pagina che stai cercando non esiste o è stata spostata.' : 'Si è verificato un errore imprevisto. Riprova tra qualche istante.' }}
      </p>

      <button
        @click="handleBack"
        class="inline-flex items-center gap-[8px] px-[24px] py-[12px] bg-[#E44203] text-white font-semibold rounded-[12px] hover:bg-[#c93a03] transition-colors cursor-pointer text-[0.875rem]">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Torna alla home
      </button>
    </div>
  </div>
</template>
