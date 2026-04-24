/**
 * checkoutSuccess — helpers for persisting / reading / clearing checkout success
 * state via URL query parameters.
 *
 * After a successful payment the checkout page encodes order-ids and payment
 * method into the URL so the success screen survives full-page reloads.
 * `clearCheckoutSuccessQuery` removes those params once they've been consumed
 * to keep the URL clean.
 */
import type { LocationQuery } from 'vue-router'

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const QUERY_KEY_SUCCESS = 'checkout_success'
const QUERY_KEY_ORDER_IDS = 'order_ids'
const QUERY_KEY_PAYMENT_METHOD = 'payment_method'

/**
 * Order statuses that are considered "successfully placed".
 * Used by components that need to decide whether an order is in a terminal
 * positive state.  "pending" is included because bonifico orders start in
 * pending and are still considered successful from the checkout perspective.
 */
export const SUCCESSFUL_ORDER_STATUSES: readonly string[] = [
  'paid',
  'payed',
  'completed',
  'processing',
  'label_generated',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'pending',
]

/* ------------------------------------------------------------------ */
/*  Build                                                             */
/* ------------------------------------------------------------------ */

interface BuildCheckoutSuccessOpts {
  orderIds: (string | number)[]
  paymentMethod: string
}

/**
 * Merges checkout-success query params into an existing query object.
 * Returns a new LocationQuery that the caller can pass to `router.replace`.
 */
export function buildCheckoutSuccessQuery(
  baseQuery: LocationQuery,
  { orderIds, paymentMethod }: BuildCheckoutSuccessOpts,
): LocationQuery {
  return {
    ...baseQuery,
    [QUERY_KEY_SUCCESS]: '1',
    [QUERY_KEY_ORDER_IDS]: orderIds.map(String).join(','),
    [QUERY_KEY_PAYMENT_METHOD]: paymentMethod,
  }
}

/* ------------------------------------------------------------------ */
/*  Read                                                              */
/* ------------------------------------------------------------------ */

interface CheckoutSuccessState {
  active: boolean
  orderIds: string[]
  paymentMethod: string
}

/**
 * Reads the checkout-success state from the current route query.
 */
export function readCheckoutSuccessState(query: LocationQuery): CheckoutSuccessState {
  const active = query[QUERY_KEY_SUCCESS] === '1'
  if (!active) {
    return { active: false, orderIds: [], paymentMethod: '' }
  }

  const rawIds = String(query[QUERY_KEY_ORDER_IDS] || '')
  const orderIds = rawIds
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  const paymentMethod = String(query[QUERY_KEY_PAYMENT_METHOD] || '')

  return { active: true, orderIds, paymentMethod }
}

/* ------------------------------------------------------------------ */
/*  Clear                                                             */
/* ------------------------------------------------------------------ */

/**
 * Returns a new LocationQuery with checkout-success params stripped out.
 * The caller should pass this to `router.replace({ query })` to clean the URL.
 */
export function clearCheckoutSuccessQuery(query: LocationQuery): LocationQuery {
  const cleaned = { ...query }
  delete cleaned[QUERY_KEY_SUCCESS]
  delete cleaned[QUERY_KEY_ORDER_IDS]
  delete cleaned[QUERY_KEY_PAYMENT_METHOD]
  return cleaned
}
