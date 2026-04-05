<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Conferma azione' },
  description: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Conferma' },
  cancelLabel: { type: String, default: 'Annulla' },
  tone: { type: String, default: 'danger' },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['update:open', 'confirm', 'cancel']);

const close = () => {
  emit('update:open', false);
  emit('cancel');
};

const toneClasses = computed(() => {
  if (props.tone === 'primary') {
    return 'btn-cta btn-compact';
  }

  return 'btn-danger btn-compact';
});

const modalUi = {
  overlay: 'bg-[#09131c]/36 backdrop-blur-[6px]',
  content: '!divide-y-0 !ring-0 !p-0 sf-modal-surface w-[min(calc(100vw-1rem),30rem)]',
  body: '!p-0',
};
</script>

<template>
  <UModal :open="open" :dismissible="!loading" :close="false" :ui="modalUi" @update:open="$emit('update:open', $event)">
    <template #body>
      <section class="sf-modal-content">
        <div class="sf-modal-header">
          <div class="sf-modal-header__main">
            <div :class="['sf-modal-icon', tone === 'primary' ? '' : 'sf-modal-icon--accent']" aria-hidden="true">
              <svg v-if="tone === 'primary'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[1.2rem] h-[1.2rem]" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20M16.59 7.58L10 14.17L7.41 11.59L6 13L10 17L18 9L16.59 7.58Z"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[1.2rem] h-[1.2rem]" fill="currentColor"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z"/></svg>
            </div>
            <div>
              <h3 class="sf-modal-title">{{ title }}</h3>
              <p class="sf-modal-description">{{ description }}</p>
            </div>
          </div>
        </div>
        <div class="sf-modal-divider" />
        <div class="sf-modal-actions">
        <button
          type="button"
          :disabled="loading"
          class="btn-secondary btn-compact inline-flex items-center justify-center gap-[6px] min-h-[46px] px-[20px] disabled:opacity-60"
          @click="close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          :disabled="loading"
          :class="['inline-flex items-center justify-center gap-[6px] min-h-[46px] px-[20px] disabled:opacity-60 cursor-pointer', toneClasses]"
          @click="$emit('confirm')"
        >
          <svg v-if="tone === 'primary'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z"/></svg>
          {{ loading ? 'Operazione in corso...' : confirmLabel }}
        </button>
        </div>
      </section>
    </template>
  </UModal>
</template>
