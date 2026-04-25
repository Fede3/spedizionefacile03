type FeedbackType = 'success' | 'info' | 'warning' | 'error'

interface FeedbackOptions {
	color?: string
	icon?: string | false
	timeout?: number
}

interface UiFeedback {
	success: (title: string, description?: string, options?: FeedbackOptions) => void
	info: (title: string, description?: string, options?: FeedbackOptions) => void
	warn: (title: string, description?: string, options?: FeedbackOptions) => void
	error: (title: string, description?: string, options?: FeedbackOptions) => void
	critical: (title: string, description?: string, options?: FeedbackOptions) => void
}

export const useUiFeedback = (): UiFeedback => {
	const toast = useToast()

	const push = (type: FeedbackType, title: string, description = '', options: FeedbackOptions = {}): void => {
		const map: Record<FeedbackType, { color: string }> = {
			success: { color: 'success' },
			info: { color: 'info' },
			warning: { color: 'warning' },
			error: { color: 'error' },
		}
		const preset = map[type] || map.warning

		toast.add({
			title,
			description: description || undefined,
			color: options.color || preset.color,
			icon: options.icon ?? false,
			timeout: options.timeout ?? 4500,
		})
	}

	return {
		success: (title, description = '', options = {}) => push('success', title, description, options),
		info: (title, description = '', options = {}) => push('info', title, description, options),
		warn: (title, description = '', options = {}) => push('warning', title, description, options),
		error: (title, description = '', options = {}) => push('error', title, description, options),
		critical: (title, description = '', options = {}) => push('error', title, description, options),
	}
}
