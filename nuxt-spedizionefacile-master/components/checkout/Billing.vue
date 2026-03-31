<!--
  Billing / fiscal document section: ricevuta vs fattura (azienda / privato).
-->
<script setup>
const props = defineProps({
  fatturazioneType:   { type: String, required: true },
  invoiceSubjectType: { type: String, required: true },
  fatturaData:        { type: Object, required: true },
  billingShippingFullAddress: { type: String, default: '' },
})

const emit = defineEmits([
  'update:fatturazioneType',
  'update:invoiceSubjectType',
])
</script>

<template>
  <div class="checkout-stage-card checkout-stage-card--billing checkout-motion-card [--checkout-delay:140ms]">
    <div class="checkout-panel-head">
      <span class="checkout-panel-head__icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>
      </span>
      <div class="checkout-panel-head__copy">
        <p class="checkout-panel-head__title">Documento fiscale</p>
      </div>
    </div>

    <div class="checkout-billing-segment">
      <div class="checkout-billing-pill-row">
        <button
          type="button"
          @click="emit('update:fatturazioneType', 'ricevuta')"
          :class="fatturazioneType === 'ricevuta' ? 'checkout-billing-pill--active' : 'checkout-billing-pill--idle'"
          class="checkout-billing-pill no-radius">
          Ricevuta
        </button>
        <button
          type="button"
          @click="emit('update:fatturazioneType', 'fattura')"
          :class="fatturazioneType === 'fattura' ? 'checkout-billing-pill--active' : 'checkout-billing-pill--idle'"
          class="checkout-billing-pill no-radius">
          Fattura
        </button>
      </div>
    </div>

    <Transition name="payment-panel">
      <div v-if="fatturazioneType === 'fattura'" key="fattura" class="checkout-billing-reveal">
        <div class="checkout-billing-context-note">
          <p class="checkout-billing-context-note__title">Intestazione</p>
          <p class="checkout-billing-context-note__text">Modifica solo se serve.</p>
          <p v-if="billingShippingFullAddress" class="checkout-billing-context-note__prefill">
            Base attuale: {{ billingShippingFullAddress }}
          </p>
        </div>
        <div class="checkout-billing-segment checkout-billing-segment--sub">
          <div class="checkout-billing-subpill-row">
            <button
              type="button"
              @click="emit('update:invoiceSubjectType', 'azienda')"
              :class="invoiceSubjectType === 'azienda' ? 'checkout-billing-subpill--active' : 'checkout-billing-subpill--idle'"
              class="checkout-billing-subpill no-radius">
              Azienda
            </button>
            <button
              type="button"
              @click="emit('update:invoiceSubjectType', 'privato')"
              :class="invoiceSubjectType === 'privato' ? 'checkout-billing-subpill--active' : 'checkout-billing-subpill--idle'"
              class="checkout-billing-subpill no-radius">
              Privato
            </button>
          </div>
        </div>

        <Transition name="payment-panel">
          <div v-if="invoiceSubjectType === 'azienda'" key="azienda" class="checkout-billing-fields">
            <div class="checkout-billing-grid checkout-billing-grid--company-top">
              <div>
                <label class="checkout-billing-label">Ragione Sociale</label>
                <input v-model="fatturaData.ragione_sociale" type="text" placeholder="SpediamoFacile S.r.l." class="checkout-billing-input" />
              </div>
              <div>
                <label class="checkout-billing-label">Partita IVA</label>
                <input v-model="fatturaData.p_iva" type="text" placeholder="IT 01234567890" class="checkout-billing-input" />
              </div>
              <div>
                <label class="checkout-billing-label">Codice Fiscale</label>
                <input v-model="fatturaData.codice_fiscale" type="text" placeholder="01234567890" class="checkout-billing-input" />
              </div>
            </div>

            <div class="checkout-billing-grid checkout-billing-grid--company-mid">
              <div>
                <label class="checkout-billing-label">Codice SDI</label>
                <input v-model="fatturaData.codice_sdi" type="text" maxlength="7" placeholder="XXXXXXX" class="checkout-billing-input" />
              </div>
              <div>
                <label class="checkout-billing-label">PEC (alternativa)</label>
                <input v-model="fatturaData.pec" type="email" placeholder="fattura@pec.azienda.it" class="checkout-billing-input" />
              </div>
            </div>

            <div class="checkout-billing-grid checkout-billing-grid--address">
              <div>
                <label class="checkout-billing-label">Indirizzo</label>
                <input v-model="fatturaData.indirizzo" type="text" placeholder="Indirizzo" class="checkout-billing-input" />
              </div>
              <div>
                <label class="checkout-billing-label">Città</label>
                <input v-model="fatturaData.city" type="text" placeholder="Città" class="checkout-billing-input" />
              </div>
              <div>
                <label class="checkout-billing-label">Prov.</label>
                <input v-model="fatturaData.province" type="text" maxlength="2" placeholder="Prov." class="checkout-billing-input" />
              </div>
              <div>
                <label class="checkout-billing-label">CAP</label>
                <input v-model="fatturaData.postal_code" type="text" maxlength="10" placeholder="CAP" class="checkout-billing-input" />
              </div>
            </div>
          </div>

          <div v-else key="privato" class="checkout-billing-fields">
            <div class="checkout-billing-grid checkout-billing-grid--private-top">
              <div>
                <label class="checkout-billing-label">Nome completo</label>
                <input v-model="fatturaData.nome_completo" type="text" placeholder="Nome e Cognome" class="checkout-billing-input" />
              </div>
              <div>
                <label class="checkout-billing-label">Codice Fiscale</label>
                <input v-model="fatturaData.codice_fiscale" type="text" placeholder="Codice Fiscale" class="checkout-billing-input" />
              </div>
            </div>

            <div class="checkout-billing-grid checkout-billing-grid--address">
              <div>
                <label class="checkout-billing-label">Indirizzo</label>
                <input v-model="fatturaData.indirizzo" type="text" placeholder="Indirizzo" class="checkout-billing-input" />
              </div>
              <div>
                <label class="checkout-billing-label">Città</label>
                <input v-model="fatturaData.city" type="text" placeholder="Città" class="checkout-billing-input" />
              </div>
              <div>
                <label class="checkout-billing-label">Prov.</label>
                <input v-model="fatturaData.province" type="text" maxlength="2" placeholder="Prov." class="checkout-billing-input" />
              </div>
              <div>
                <label class="checkout-billing-label">CAP</label>
                <input v-model="fatturaData.postal_code" type="text" maxlength="10" placeholder="CAP" class="checkout-billing-input" />
              </div>
            </div>
          </div>
        </Transition>
      </div>
      <div v-else key="ricevuta" class="checkout-billing-receipt-note">
        <p>Usiamo i dati del checkout.</p>
      </div>
    </Transition>
  </div>
</template>
