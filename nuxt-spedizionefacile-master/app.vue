<script setup>
const { session } = useSession();
const userStore = useUserStore();

if (session.value && session.value?.data?.packages && session.value?.data?.shipment_details) {
	userStore.shipmentDetails = { ...session.value?.data?.shipment_details };
	userStore.packages = session.value?.data?.packages;
	/* userStore.totalPrice = session.value?.data?.total_price; */
	/* userStore.stepNumber = session.value?.data?.step; */
}
</script>

<template>
	<UApp>
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
	</UApp>
</template>
