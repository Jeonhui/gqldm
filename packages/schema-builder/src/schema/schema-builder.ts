import {makeExecutableSchema} from '@graphql-tools/schema';
import {SchemaMap, TableMeta} from "../types";
import {IExecutableSchemaDefinition} from "@graphql-tools/schema";
import {GraphQLSchema} from "graphql/type";
import {Introspector, IntrospectorDatabaseConfig} from "../introspector";
import {snakeCaseToCamelCase, uppercaseFirst, lowercaseFirst} from "@gqldm/utils";

export type SchemaBuilderConfig = {
    introspectorDatabaseConfig?: IntrospectorDatabaseConfig
    schemaMap?: SchemaMap
}

export class SchemaBuilder {
    private readonly introspector?: Introspector = undefined;
    private readonly schemaMap: SchemaMap

    constructor(private readonly schemaBuilderConfig: SchemaBuilderConfig) {
        if (schemaBuilderConfig.introspectorDatabaseConfig) {
            this.introspector = new Introspector(schemaBuilderConfig.introspectorDatabaseConfig);
        }
        this.schemaMap = schemaBuilderConfig.schemaMap || {};
    }

    // MARK: - Private Methods (Common Logic)
    private static sqlTypeToGraphQLType(sqlType: string): string {
        const type = sqlType.toLowerCase();
        if (['int', 'integer', 'smallint'].includes(type)) return 'Int';
        if (['bigint'].includes(type)) return 'String';
        if (['float', 'double', 'decimal'].includes(type)) return 'Float';
        if (['tinyint', 'boolean', 'bit'].includes(type)) return 'Boolean';
        if (['char', 'varchar', 'text', 'json', 'uuid'].includes(type)) return 'String';
        if (['date', 'datetime', 'timestamp'].includes(type)) return 'String';
        return 'String';
    }

    private getSchemaName = (tableName: string): string => {
        const schemaName = this.schemaMap[tableName];
        if (schemaName) {
            return schemaName;
        }
        return uppercaseFirst(snakeCaseToCamelCase(tableName));
    }

    private generateTypeDef = (table: TableMeta): string => {
        const fields = table.columns.flatMap((column) => {
            const gqlType = SchemaBuilder.sqlTypeToGraphQLType(column.dataType);
            const nullableMark = column.isNullable ? '' : '!';
            const foreign = column.foreign;
            const columns = [`  ${column.column}: ${gqlType}${nullableMark}`];
            if (!foreign) {
                return columns;
            }
            const columnName = snakeCaseToCamelCase(column.column);
            const foreignTypeName = this.getSchemaName(foreign.referencedTable);
            let foreignColumnName = lowercaseFirst(foreignTypeName)
            if (columnName.includes('By')) {
                foreignColumnName = `${lowercaseFirst(columnName)}${uppercaseFirst(foreignTypeName)}`;
            }
            columns.push(`  ${foreignColumnName}: ${foreignTypeName}`);
            return columns;
        });
        const typeName = this.getSchemaName(table.table);
        return `type ${typeName} {\n${fields.join('\n')}\n}`;
    }

    // MARK: - Public Methods
    buildSchemaWithMeta<TContext = any>(tablesMeta: TableMeta[], definition: Omit<IExecutableSchemaDefinition<TContext>, 'typeDefs'> | undefined = undefined): GraphQLSchema {
        const typeDefs = tablesMeta.map(this.generateTypeDef).join('\n\n');
        const dummyQuery = 'type Query {  _dummy: String }';
        const typeDefResults = typeDefs.length != 0 ? typeDefs : dummyQuery;
        return makeExecutableSchema({
            typeDefs: typeDefResults,
            ...definition
        });
    }

    // MARK: - Public Methods
    async buildSchema<TContext = any>(definition: Omit<IExecutableSchemaDefinition<TContext>, 'typeDefs'> | undefined = undefined): Promise<GraphQLSchema> {
        if (!this.introspector) {
            throw new Error('Introspector is not configured.');
        }
        const tablesMeta = await this.introspector.introspect();
        return this.buildSchemaWithMeta(tablesMeta, definition);
    }
}

