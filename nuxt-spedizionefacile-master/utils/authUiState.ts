export type AuthUiSnapshot = {
	authenticated: boolean;
	name: string;
	surname: string;
	email: string;
	createdAt: string;
	userType: string;
	role: string | null;
};

export type AuthUiUser = {
	name?: string | null;
	surname?: string | null;
	email?: string | null;
	created_at?: string | null;
	user_type?: string | null;
	role?: string | null;
};

export type AuthBootstrapStatus = 'idle' | 'pending' | 'resolved' | 'failed';

export const AUTH_UI_COOKIE = 'sf_auth_ui';
export const AUTH_UI_STORAGE = 'sf_auth_ui_cache';

export const createEmptySnapshot = (): AuthUiSnapshot => ({
	authenticated: false,
	name: '',
	surname: '',
	email: '',
	createdAt: '',
	userType: '',
	role: null,
});

export const snapshotFromUser = (user: AuthUiUser): AuthUiSnapshot => ({
	authenticated: true,
	name: String(user.name || ''),
	surname: String(user.surname || ''),
	email: String(user.email || ''),
	createdAt: String(user.created_at || ''),
	userType: String(user.user_type || ''),
	role: user.role || null,
});

export const parseStoredSnapshot = (value: string | null): AuthUiSnapshot => {
	if (!value) {
		return createEmptySnapshot();
	}

	try {
		const parsed = JSON.parse(value) as Partial<AuthUiSnapshot>;
		if (!parsed.authenticated) {
			return createEmptySnapshot();
		}

		return {
			authenticated: true,
			name: String(parsed.name || ''),
			surname: String(parsed.surname || ''),
			email: String(parsed.email || ''),
			createdAt: String(parsed.createdAt || ''),
			userType: String(parsed.userType || ''),
			role: parsed.role || null,
		};
	} catch {
		return createEmptySnapshot();
	}
};

export const extractCookieValue = (cookieHeader: string, name: string): string | null => {
	const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return match?.[1] ? decodeURIComponent(match[1]) : null;
};

export const hasAuthSessionCookie = (cookieHeader: string): boolean =>
	cookieHeader.includes('laravel_session') || cookieHeader.includes('XSRF-TOKEN');

export const readAuthUiSnapshotFromCookieHeader = (cookieHeader: string): AuthUiSnapshot =>
	parseStoredSnapshot(extractCookieValue(cookieHeader, AUTH_UI_COOKIE));
