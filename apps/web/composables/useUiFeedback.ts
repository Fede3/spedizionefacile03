type FeedbackType = 'success' | 'info' | 'warning' | 'error'
type FeedbackOptions = {
	color?: string
	icon?: string | boolean
	timeout?: number
}

export const useUiFeedback = () => {
	const toast = useToast()
	const typeDefaults: Record<FeedbackType, { color: string }> = {
		success: { color: 'success' },
		info: { color: 'info' },
		warning: { color: 'warning' },
		error: { color: 'error' },
	}
	const push = (type: FeedbackType, title: string, description = '', options: FeedbackOptions = {}) => {
		const preset = typeDefaults[type]
		const payload = {
			title,
			description: description || undefined,
			color: options.color || preset.color,
			icon: options.icon ?? false,
			timeout: options.timeout ?? 4500,
		} as Parameters<typeof toast.add>[0] & { timeout?: number }

		toast.add(payload)
	}

	return {
		success: (title: string, description = '', options: FeedbackOptions = {}) => push('success', title, description, options),
		info: (title: string, description = '', options: FeedbackOptions = {}) => push('info', title, description, options),
		warn: (title: string, description = '', options: FeedbackOptions = {}) => push('warning', title, description, options),
		error: (title: string, description = '', options: FeedbackOptions = {}) => push('error', title, description, options),
		critical: (title: string, description = '', options: FeedbackOptions = {}) => push('error', title, description, options),
	}
}
