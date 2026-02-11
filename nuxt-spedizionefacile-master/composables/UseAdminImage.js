export const useAdminImage = () => {
	const { data, refresh, status } = useSanctumFetch("/api/get-admin-image", {
		method: "GET",
	});

	return { data, refresh, status };
};
