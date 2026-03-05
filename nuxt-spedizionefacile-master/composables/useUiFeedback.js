export const useUiFeedback = () => {
	const toast = useToast();

	const push = (type, title, description = "", options = {}) => {
		const map = {
			success: { color: "success", icon: "mdi:check-circle-outline" },
			info: { color: "info", icon: "mdi:information-outline" },
			warning: { color: "warning", icon: "mdi:alert-circle-outline" },
			error: { color: "error", icon: "mdi:alert-octagon-outline" },
		};
		const preset = map[type] || map.warning;

		toast.add({
			title,
			description: description || undefined,
			color: options.color || preset.color,
			icon: options.icon || preset.icon,
			timeout: options.timeout ?? 4500,
		});
	};

	return {
		success: (title, description = "", options = {}) => push("success", title, description, options),
		info: (title, description = "", options = {}) => push("info", title, description, options),
		warn: (title, description = "", options = {}) => push("warning", title, description, options),
		error: (title, description = "", options = {}) => push("warning", title, description, options),
		critical: (title, description = "", options = {}) => push("error", title, description, options),
	};
};

