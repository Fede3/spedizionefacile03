export const useSession = () => {
	const {
		data: session,
		status,
		refresh,
	} = useSanctumFetch(
		"/api/session",
		{
			method: "GET",
		},
		"session",
	);

	return { session, refresh, status };
};
