import { describe, it, expect, vi } from 'vitest';
import { buildCheckoutSubmissionSignature, recoverCheckoutCartState } from '~/composables/useCheckout';

describe('useCheckout helpers', () => {
	describe('buildCheckoutSubmissionSignature', () => {
		it('changes when billing payload changes', () => {
			const cartPackages = [
				{
					id: 12,
					package_type: 'Pacco',
					quantity: 1,
					single_price: 1590,
					origin_address: { city: 'Milano', postal_code: '20121' },
					destination_address: { city: 'Roma', postal_code: '00185' },
					services: { service_type: 'standard' },
				},
			];

			const signatureA = buildCheckoutSubmissionSignature({
				existingOrderId: null,
				cartPackages: cartPackages as any,
				billingPayload: { type: 'ricevuta' } as any,
			});

			const signatureB = buildCheckoutSubmissionSignature({
				existingOrderId: null,
				cartPackages: cartPackages as any,
				billingPayload: {
					type: 'fattura',
					subject_type: 'privato',
					nome_completo: 'Mario Rossi',
				} as any,
			});

			expect(signatureA).not.toBe(signatureB);
		});

		it('changes when cart snapshot changes', () => {
			const billingPayload = { type: 'ricevuta' };

			const signatureA = buildCheckoutSubmissionSignature({
				existingOrderId: null,
				cartPackages: [{ id: 1, package_type: 'Pacco', quantity: 1, single_price: 1590 }] as any,
				billingPayload: billingPayload as any,
			});

			const signatureB = buildCheckoutSubmissionSignature({
				existingOrderId: null,
				cartPackages: [{ id: 1, package_type: 'Pacco', quantity: 2, single_price: 1590 }] as any,
				billingPayload: billingPayload as any,
			});

			expect(signatureA).not.toBe(signatureB);
		});
	});

	describe('recoverCheckoutCartState', () => {
		it('clears and refreshes cart state deterministically', async () => {
			const clearCartData = vi.fn();
			const refreshCartState = vi.fn(() => Promise.resolve('refreshed'));
			const refreshCartCache = vi.fn(() => Promise.resolve('cache-refreshed'));

			await recoverCheckoutCartState({
				clearCartData,
				refreshCartState,
				refreshCartCache,
				cartKey: 'cart',
			} as any);

			expect(clearCartData).toHaveBeenCalledTimes(1);
			expect(clearCartData).toHaveBeenCalledWith('cart');
			expect(refreshCartState).toHaveBeenCalledTimes(1);
			expect(refreshCartCache).toHaveBeenCalledTimes(1);
			expect(refreshCartCache).toHaveBeenCalledWith('cart');
		});
	});
});
