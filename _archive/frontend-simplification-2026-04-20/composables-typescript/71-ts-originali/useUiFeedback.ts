type ToastType = 'success' | 'info' | 'warning' | 'error'

interface ToastOptions {
	color?: string
	icon?: string | false
	timeout?: number
}

interface UiFeedback {
	success: (title: string, description?: string, options?: ToastOptions) => void
	info: (title: string, description?: string, options?: ToastOptions) => void
	warn: (title: string, description?: string, options?: ToastOptions) => void
	error: (title: string, description?: string, options?: ToastOptions) => void
	critical: (title: string, description?: string, options?: ToastOptions) => void
}

export const useUiFeedback = (): UiFeedback => {
	const toast = useToast()

	const map: Record<ToastType, { color: string }> = {
		success: { color: 'success' },
		info: { color: 'info' },
		warning: { color: 'warning' },
		error: { color: 'error' },
	}

	const push = (
		type: ToastType,
		title: string,
		description = '',
		options: ToastOptions = {},
	): void => {
		const preset = map[type] || map.warning

		toast.add({
			title,
			description: description || undefined,
			color: (options.color || preset.color) as never,
			icon: (options.icon ?? false) as never,
			timeout: options.timeout ?? 4500,
		} as never)
	}

	return {
		success: (title, description = '', options = {}) => push('success', title, description, options),
		info: (title, description = '', options = {}) => push('info', title, description, options),
		warn: (title, description = '', options = {}) => push('warning', title, description, options),
		error: (title, description = '', options = {}) => push('error', title, description, options),
		critical: (title, description = '', options = {}) => push('error', title, description, options),
	}
}
