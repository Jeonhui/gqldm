import {makeExecutableSchema} from '@graphql-tools/schema';
import {TableMeta} from "../types";
import {IExecutableSchemaDefinition} from "@graphql-tools/schema";
import {GraphQLSchema} from "graphql/type";
import {Introspector, IntrospectorDatabaseConfig} from "../introspector";

export type SchemaBuilderConfig = {
    introspectorDatabaseConfig?: IntrospectorDatabaseConfig
}

export class SchemaBuilder {
    private readonly introspector?: Introspector = undefined;

    constructor(private readonly schemaBuilderConfig: SchemaBuilderConfig) {
        if (schemaBuilderConfig.introspectorDatabaseConfig) {
            this.introspector = new Introspector(schemaBuilderConfig.introspectorDatabaseConfig);
        }
    }

    // MARK: - Private Static Methods (Common Logic)
    static sqlTypeToGraphQLType(sqlType: string): string {
        const type = sqlType.toLowerCase();
        if (['int', 'integer', 'smallint'].includes(type)) return 'Int';
        if (['bigint'].includes(type)) return 'String';
        if (['float', 'double', 'decimal'].includes(type)) return 'Float';
        if (['tinyint', 'boolean', 'bit'].includes(type)) return 'Boolean';
        if (['char', 'varchar', 'text', 'json', 'uuid'].includes(type)) return 'String';
        if (['date', 'datetime', 'timestamp'].includes(type)) return 'String';
        return 'String';
    }

    static capitalize(name: string) {
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    static generateTypeDef(table: TableMeta): string {
        const fields = table.columns.map(col => {
            const gqlType = SchemaBuilder.sqlTypeToGraphQLType(col.dataType);
            const nullableMark = col.isNullable ? '' : '!';
            return `  ${col.column}: ${gqlType}${nullableMark}`;
        });

        if (table.foreignKeys) {
            const fieldSet = new Set(fields.map(f => f.split(':')[0].trim()));

            for (const fk of table.foreignKeys) {
                let baseName = fk.column;
                if (baseName.endsWith('_id')) baseName = baseName.replace(/_id$/, '');
                else if (baseName.endsWith('_code')) baseName = baseName.replace(/_code$/, '');
                else if (baseName.endsWith('_by')) baseName = baseName.replace(/_by$/, '');
                else baseName = `${baseName}_ref`;

                let fieldName = baseName;
                let counter = 1;
                while (fieldSet.has(fieldName)) {
                    fieldName = `${baseName}${counter++}`;
                }
                fieldSet.add(fieldName);

                const typeName = SchemaBuilder.capitalize(fk.referencedTable);
                fields.push(`  ${fieldName}: ${typeName}`);
            }
        }

        const typeName = SchemaBuilder.capitalize(table.table);
        return `type ${typeName} {\n${fields.join('\n')}\n}`;
    }

    // MARK: - Public Static Methods
    static async buildSchema(tablesMeta: TableMeta[]): Promise<GraphQLSchema> {
        const typeDefs = tablesMeta.map(SchemaBuilder.generateTypeDef).join('\n\n');

        const fullTypeDefs = `
${typeDefs}

type Query {
  _dummy: String
}`;

        return makeExecutableSchema({
            typeDefs: fullTypeDefs,
        });
    }

    static async buildSchemaWithDefinition<TContext = any>(tablesMeta: TableMeta[], definition: Omit<IExecutableSchemaDefinition<TContext>, 'typeDefs'>): Promise<GraphQLSchema> {
        const typeDefs = tablesMeta.map(SchemaBuilder.generateTypeDef).join('\n\n');

        const fullTypeDefs = `
${typeDefs}

type Query {
  _dummy: String
}`;

        return makeExecutableSchema({
            typeDefs: fullTypeDefs,
            ...definition
        });
    }

    // MARK: - Public Methods
    async buildSchema(): Promise<GraphQLSchema> {
        if (!this.introspector) {
            throw new Error('Introspector is not configured.');
        }
        const tablesMeta = await this.introspector.introspect();
        return SchemaBuilder.buildSchema(tablesMeta);
    }
}

