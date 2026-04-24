/**
 * useCheckoutCoupon — coupon and referral logic for checkout.
 *
 * Handles coupon code validation, auto-apply referral discount,
 * and coupon removal.
 *
 * @param {Object} deps
 * @param {import('vue').ComputedRef<number>} deps.getNumberTotal - numeric total before discounts
 */
export function useCheckoutCoupon({ getNumberTotal }) {
	const sanctum = useSanctumClient();

	const couponCode = ref('');
	const couponLoading = ref(false);
	const couponError = ref(null);
	const couponApplied = ref(null);
	const couponPanelOpen = ref(false);

	const validateCoupon = async () => {
		if (!couponCode.value || couponCode.value.trim().length < 2) return;
		couponLoading.value = true;
		couponError.value = null;
		couponApplied.value = null;
		try {
			const result = await sanctum('/api/calculate-coupon', {
				method: 'POST',
				body: { coupon: couponCode.value.trim().toUpperCase(), total: getNumberTotal.value },
			});
			if (result?.success) {
				couponApplied.value = {
					type: result.type || 'coupon',
					discount_percent: result.percentage,
					discount_amount: result.discount_amount,
					pro_name: result.pro_user_name || '',
					code: result.referral_code || couponCode.value.trim().toUpperCase(),
				};
				couponPanelOpen.value = true;
			}
		} catch (e) {
			const data = e?.response?._data || e?.data;
			couponError.value = data?.error || data?.message || 'Codice non valido.';
			couponPanelOpen.value = true;
		} finally {
			couponLoading.value = false;
		}
	};

	const autoApplyReferral = async () => {
		if (couponApplied.value) return;
		try {
			const result = await sanctum('/api/referral/my-discount');
			if (result?.has_discount && result?.referral_code) {
				couponCode.value = result.referral_code;
				const discountAmount = Math.round(getNumberTotal.value * (result.discount_percent / 100) * 100) / 100;
				couponApplied.value = {
					type: 'referral',
					discount_percent: result.discount_percent,
					discount_amount: discountAmount,
					pro_name: result.pro_name || '',
					code: result.referral_code,
				};
			}
		} catch (e) {
			// Silently ignore - user may not have referral
		}
	};

	const removeCoupon = () => {
		couponApplied.value = null;
		couponCode.value = '';
		couponError.value = null;
		couponPanelOpen.value = false;
	};

	return {
		couponCode,
		couponLoading,
		couponError,
		couponApplied,
		couponPanelOpen,
		validateCoupon,
		removeCoupon,
		autoApplyReferral,
	};
}
