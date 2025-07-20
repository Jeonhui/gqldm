import {IntrospectorDatabaseConfig, SchemaBuilder, SchemaBuilderConfig} from "@gqldm/schema-builder";
import {exit} from "node:process";
import {writeFile} from "node:fs/promises";
import {printSchema} from "graphql";

export async function buildSchema(config: IntrospectorDatabaseConfig) {
    const schemaBuilderConfig: SchemaBuilderConfig = {
        introspectorDatabaseConfig: config
    }
    console.log('🏁 Build database schema to graphql...');
    const schemaBuilder = new SchemaBuilder(schemaBuilderConfig);
    const gqlschema = await schemaBuilder.buildSchema()
    if (!gqlschema) {
        console.error('❌ Failed to build schema.');
        exit(1);
    }
    const sdl = printSchema(gqlschema);
    await writeFile('./schema.graphql', sdl, 'utf-8');
    console.log('✅ build completed successfully. Saved to schema.graphql');
}