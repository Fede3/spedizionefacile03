/**
 * Vue Symbol-typed InjectionKey per provide/inject.
 *
 * Sostituisce le string-key (`inject('shipmentFormHandlers')`) con
 * `InjectionKey<T>` typed: il consumer ottiene autocomplete e type-check
 * sul payload iniettato.
 *
 * Convenzione: una key per dominio. Se servono piu' iniezioni, prefisso
 * dominio (es. `shipmentXxxKey`, `paymentXxxKey`).
 */
import type { InjectionKey } from 'vue'
import type {
	ShipmentFormHandlers,
	ShipmentSuggestions,
} from '~/types/shipmentAddressForm'

/**
 * Iniezione handler form indirizzi (ShipmentFlowPage → AddressFormFields,
 * AddressFieldFeedback, StepAddressSection, sub-componenti address/*).
 */
export const shipmentFormHandlersKey: InjectionKey<ShipmentFormHandlers>
	= Symbol('shipmentFormHandlers')

/**
 * Iniezione array suggerimenti autocomplete location (CAP/citta/provincia per
 * mittente + destinatario).
 */
export const shipmentSuggestionsKey: InjectionKey<ShipmentSuggestions>
	= Symbol('shipmentSuggestions')
