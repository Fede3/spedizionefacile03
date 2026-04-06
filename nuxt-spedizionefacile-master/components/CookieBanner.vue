<script setup>
const client = useSanctumClient();
const visible = ref(false);
const showPreferences = ref(false);
const preferences = reactive({
  analytics: false,
  marketing: false,
  functional: true,
});

onMounted(() => {
  if (!localStorage.getItem('cookie_consent')) {
    visible.value = true;
  }
});

const sendConsentToBackend = async (consentData) => {
  try {
    await client('/api/cookie-consent', { method: 'POST', body: consentData });
  } catch {
    // Il consenso locale e' gia' salvato — il backend log e' best-effort
  }
};

const accept = (type) => {
  localStorage.setItem('cookie_consent', type);
  visible.value = false;

  if (type === 'all') {
    sendConsentToBackend({ type: 'all' });
  } else if (type === 'essential') {
    sendConsentToBackend({ type: 'necessary' });
  }
};

const acceptCustom = () => {
  const consent = {
    analytics: preferences.analytics,
    marketing: preferences.marketing,
    functional: preferences.functional,
  };
  localStorage.setItem('cookie_consent', JSON.stringify(consent));
  visible.value = false;
  sendConsentToBackend(consent);
};
</script>

<template>
  <Transition name="cookie-banner">
    <div
      v-if="visible"
      class="cookie-banner"
      role="dialog"
      aria-label="Gestione cookie">
      <div class="cookie-banner__inner">
        <div class="cookie-banner__content">
          <div class="cookie-banner__icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
              <path d="M2 12h.01"/><path d="M12 2v.01"/><path d="M12 14a2 2 0 0 0 2-2"/>
              <circle cx="7.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="11" cy="7" r=".5" fill="currentColor"/><circle cx="8" cy="16" r=".5" fill="currentColor"/><circle cx="14.5" cy="15.5" r=".5" fill="currentColor"/>
            </svg>
          </div>
          <div class="cookie-banner__text">
            <p class="cookie-banner__message">
              Utilizziamo i cookie per migliorare la tua esperienza di navigazione e offrirti un servizio su misura.
              <NuxtLink to="/cookie-policy" class="cookie-banner__link">Scopri di piu'</NuxtLink>
            </p>
          </div>
        </div>

        <!-- Pannello preferenze granulari -->
        <div v-if="showPreferences" class="cookie-banner__preferences">
          <label class="cookie-pref">
            <input type="checkbox" checked disabled class="cookie-pref__check" />
            <span class="cookie-pref__label">Necessari <span class="cookie-pref__hint">(sempre attivi)</span></span>
          </label>
          <label class="cookie-pref">
            <input v-model="preferences.functional" type="checkbox" class="cookie-pref__check" />
            <span class="cookie-pref__label">Funzionali</span>
          </label>
          <label class="cookie-pref">
            <input v-model="preferences.analytics" type="checkbox" class="cookie-pref__check" />
            <span class="cookie-pref__label">Analitici</span>
          </label>
          <label class="cookie-pref">
            <input v-model="preferences.marketing" type="checkbox" class="cookie-pref__check" />
            <span class="cookie-pref__label">Marketing</span>
          </label>
          <div class="cookie-banner__pref-actions">
            <button
              type="button"
              @click="acceptCustom"
              class="btn-cta btn-compact">
              Salva preferenze
            </button>
          </div>
        </div>

        <!-- Bottoni principali -->
        <div v-else class="cookie-banner__actions">
          <button
            type="button"
            @click="accept('essential')"
            class="btn-outline btn-compact cookie-banner__btn">
            Rifiuta tutti
          </button>
          <button
            type="button"
            @click="showPreferences = true"
            class="btn-secondary btn-compact cookie-banner__btn">
            Personalizza
          </button>
          <button
            type="button"
            @click="accept('all')"
            class="btn-cta btn-compact cookie-banner__btn">
            Accetta tutti
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  border-radius: var(--sf-radius-card) var(--sf-radius-card) 0 0;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow:
    0 -8px 40px rgba(15, 23, 42, 0.10),
    0 -2px 8px rgba(15, 23, 42, 0.04);
  border-top: 1px solid var(--color-brand-border);
}

.cookie-banner__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 18px 24px max(18px, env(safe-area-inset-bottom));
}

.cookie-banner__content {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  flex: 1 1 auto;
  min-width: 0;
}

.cookie-banner__icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--sf-radius-control);
  background: var(--color-brand-secondary-soft-bg);
  border: 1px solid var(--color-brand-secondary-soft-border);
  color: var(--color-brand-secondary-soft-text);
}

.cookie-banner__text {
  min-width: 0;
}

.cookie-banner__message {
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--color-brand-text);
}

.cookie-banner__link {
  color: var(--color-brand-primary);
  font-weight: 600;
  white-space: nowrap;
}

.cookie-banner__link:hover {
  text-decoration: underline;
}

.cookie-banner__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.cookie-banner__btn {
  white-space: nowrap;
}

/* Pannello preferenze */
.cookie-banner__preferences {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  flex: 0 0 auto;
}

.cookie-pref {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  color: var(--color-brand-text);
  cursor: pointer;
  white-space: nowrap;
}

.cookie-pref:first-child {
  cursor: not-allowed;
  opacity: 0.65;
}

.cookie-pref__check {
  width: 16px;
  height: 16px;
  accent-color: var(--color-brand-primary);
}

.cookie-pref__hint {
  font-size: 0.6875rem;
  color: var(--color-brand-text-secondary);
}

.cookie-banner__pref-actions {
  margin-left: 4px;
}

/* Responsive: stack verticale su mobile */
@media (max-width: 47.99rem) {
  .cookie-banner__inner {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 16px 18px max(16px, env(safe-area-inset-bottom));
  }

  .cookie-banner__actions {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }

  .cookie-banner__preferences {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .cookie-banner__pref-actions {
    width: 100%;
    margin-left: 0;
    margin-top: 4px;
  }

  .cookie-banner__pref-actions .btn-cta {
    width: 100%;
  }
}

/* Animazione: fade-in + slide-up */
.cookie-banner-enter-active {
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease;
}
.cookie-banner-leave-active {
  transition: transform 0.28s cubic-bezier(0.55, 0, 1, 0.45), opacity 0.22s ease;
}
.cookie-banner-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.cookie-banner-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
