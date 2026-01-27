import type { CodegenConfig } from "@graphql-codegen/cli"

const config: CodegenConfig = {
	schema: [
		{
			"https://beta.felleskomponent.no/graphql/graphql": {
				headers: {
					Authorization: `Bearer ${process.env.FINT_GENERATE_TYPES_MANUAL_KEY}`
				}
			}
		}
	],
	documents: ["./src/lib/server/fint/queries/**/*.graphql"],

	generates: {
		"./src/lib/types/fint/fint-school-with-students.ts": {
			plugins: ["typescript", "typescript-operations"],
			config: {
				scalars: {
          Date: 'string',
          Long: 'number'
        },
				preResolveTypes: true,
				omitOperationSuffix: true,
				onlyOperationTypes: true,
				skipTypename: true,
				useTypeImports: true,
				extractAllFieldsToTypes: false,
				inlineFragmentTypes: "combine",
				printFieldsOnNewLines: true
			}
		}
	}
}
export default config
