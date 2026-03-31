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
    return 'btn-primary';
  }

  return 'btn-danger';
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
              <Icon :name="tone === 'primary' ? 'mdi:check-circle-outline' : 'mdi:delete-outline'" class="text-[1.2rem]" />
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
          class="btn-secondary inline-flex items-center justify-center gap-[6px] min-h-[46px] px-[20px] disabled:opacity-60"
          @click="close"
        >
          <Icon name="mdi:close" class="text-[18px]" />
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          :disabled="loading"
          :class="['inline-flex items-center justify-center gap-[6px] min-h-[46px] px-[20px] disabled:opacity-60 cursor-pointer', toneClasses]"
          @click="$emit('confirm')"
        >
          <Icon :name="tone === 'primary' ? 'mdi:check' : 'mdi:delete-outline'" class="text-[18px]" />
          {{ loading ? 'Operazione in corso...' : confirmLabel }}
        </button>
        </div>
      </section>
    </template>
  </UModal>
</template>
