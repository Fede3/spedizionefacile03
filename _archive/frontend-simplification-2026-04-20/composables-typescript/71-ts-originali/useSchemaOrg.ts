export type SchemaOrgEntity = Record<string, unknown>;

export const useSchemaOrg = (schema: SchemaOrgEntity | SchemaOrgEntity[], key = 'schema-org') => {
	const entities = Array.isArray(schema) ? schema : [schema];

	useHead({
		script: entities.map((entity, index) => ({
			key: `${key}-${index}`,
			type: 'application/ld+json',
			innerHTML: JSON.stringify(entity),
		})),
	});
};
