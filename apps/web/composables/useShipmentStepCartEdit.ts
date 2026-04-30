import type { Ref } from 'vue'
import { computed, ref } from 'vue'

type StepAddress = {
	name?: string
	full_name?: string
	address?: string
	address_number?: string
	city?: string
	postal_code?: string
	province?: string
	telephone_number?: string
	email?: string
	additional_information?: string
	intercom_code?: string
}
type StepServices = {
	date?: string
	time?: string
	service_type?: string
	serviceData?: Record<string, unknown>
}
type CartEditItem = {
	origin_address?: StepAddress
	destination_address?: StepAddress
	services?: StepServices
	content_description?: string
	package_type?: string
	quantity?: number
	weight?: number | string
	first_size?: number | string
	second_size?: number | string
	third_size?: number | string
	weight_price?: number
	volume_price?: number
	single_price?: number
}
type CartEditResponse = {
	data?: CartEditItem
}
type ShipmentFlowStoreLike = {
	editingCartItemId: number | null
	pickupDate: string
	servicesArray: string[]
	contentDescription: string
	serviceData: Record<string, unknown>
	packages: Record<string, unknown>[]
	shipmentDetails: Record<string, unknown>
}
type CartEditOptions = {
	sanctumClient: <T = CartEditResponse>(url: string) => Promise<T>
	session: Ref<{ data?: { packages?: Record<string, unknown>[] } | null } | null | undefined>
	syncSelectedServicesVisual: () => void
	shipmentFlowStore: ShipmentFlowStoreLike
}
type LoadCartItemContext = {
	originAddress: Ref<StepAddress>
	destinationAddress: Ref<StepAddress>
	services: Ref<StepServices>
	showAddressFields: Ref<boolean>
}
type RequestError = {
	response?: { status?: number | string }
	statusCode?: number | string
}

export const useShipmentStepCartEdit = ({
	sanctumClient,
	session,
	syncSelectedServicesVisual,
	shipmentFlowStore,
}: CartEditOptions) => {
	const route = useRoute()
	const rawEditParam = Array.isArray(route.query.edit)
		? route.query.edit[0]
		: route.query.edit ?? route.query.edit_id
	const parsedEditCartId = Number(rawEditParam)
	const editCartId = Number.isInteger(parsedEditCartId) && parsedEditCartId > 0 ? parsedEditCartId : null
	const loadingEditData = ref(Boolean(editCartId))

	const editablePackages = computed(() => {
		if (shipmentFlowStore.packages.length) return shipmentFlowStore.packages
		if (editCartId && shipmentFlowStore.packages.length > 0 && !session.value?.data?.packages?.length) {
			return shipmentFlowStore.packages
		}
		if (session.value?.data?.packages?.length) return session.value.data.packages
		return []
	})
	const populateAddress = (target: Ref<StepAddress>, source?: StepAddress) => {
		if (!source) return
		target.value.full_name = source.full_name || source.name || ''
		target.value.address = source.address || ''
		target.value.address_number = source.address_number || ''
		target.value.city = source.city || ''
		target.value.postal_code = source.postal_code || ''
		target.value.province = source.province || ''
		target.value.telephone_number = source.telephone_number || ''
		target.value.email = source.email || ''
		target.value.additional_information = source.additional_information || ''
		target.value.intercom_code = source.intercom_code || ''
	}
	const clearInvalidEditState = async () => {
		shipmentFlowStore.editingCartItemId = null
		const nextQuery = { ...route.query }
		delete nextQuery.edit
		delete nextQuery.edit_id
		await navigateTo({ path: route.path, query: nextQuery }, { replace: true })
	}
	const loadCartItemForEdit = async ({ originAddress, destinationAddress, services, showAddressFields }: LoadCartItemContext) => {
		if (!editCartId) return

		try {
			const result = await sanctumClient<CartEditResponse | CartEditItem>(`/api/cart/${editCartId}`)
			const item = ('data' in result && result.data ? result.data : result) as CartEditItem
			shipmentFlowStore.editingCartItemId = editCartId

			populateAddress(originAddress, item.origin_address)
			populateAddress(destinationAddress, item.destination_address)

			if (item.services) {
				services.value.date = item.services.date || ''
				services.value.time = item.services.time || ''
				services.value.service_type = item.services.service_type || ''
				shipmentFlowStore.pickupDate = item.services.date || ''
				shipmentFlowStore.servicesArray = String(item.services.service_type || '')
					.split(', ')
					.filter((service) => service && service !== 'Nessuno')
				syncSelectedServicesVisual()
			}

			if (item.content_description) {
				shipmentFlowStore.contentDescription = item.content_description
			}
			if (item.services?.serviceData) {
				shipmentFlowStore.serviceData = { ...item.services.serviceData }
			}

			const priceInEuro = item.single_price ? Number(item.single_price) / 100 : 0
			shipmentFlowStore.packages = [{
				package_type: item.package_type || 'Pacco',
				quantity: item.quantity || 1,
				weight: item.weight,
				first_size: item.first_size,
				second_size: item.second_size,
				third_size: item.third_size,
				weight_price: item.weight_price,
				volume_price: item.volume_price,
				single_price: priceInEuro,
			}]

			shipmentFlowStore.shipmentDetails = {
				origin_city: item.origin_address?.city || '',
				origin_postal_code: item.origin_address?.postal_code || '',
				destination_city: item.destination_address?.city || '',
				destination_postal_code: item.destination_address?.postal_code || '',
				date: item.services?.date || '',
			}
			showAddressFields.value = true
		} catch (error) {
			shipmentFlowStore.editingCartItemId = null
			const err = error as RequestError
			const statusCode = Number(err.response?.status || err.statusCode || 0)
			if (statusCode === 404) await clearInvalidEditState()
		} finally {
			loadingEditData.value = false
		}
	}

	return {
		editCartId,
		editablePackages,
		loadCartItemForEdit,
		loadingEditData,
	}
}
