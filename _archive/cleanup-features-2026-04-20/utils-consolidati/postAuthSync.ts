const POST_AUTH_RETRY_DELAYS = [0, 180, 420, 900]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const waitForPostAuthSync = async (
	refreshIdentity: () => Promise<unknown>,
) => {
	for (const delay of POST_AUTH_RETRY_DELAYS) {
		if (delay > 0) {
			await wait(delay)
		}

		try {
			await refreshIdentity()
			return true
		} catch {
			// Dopo login/registrazione i cookie possono assestarsi con un leggero ritardo.
		}
	}

	return false
}
