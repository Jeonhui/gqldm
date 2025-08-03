import {IntrospectorDatabaseConfig, SchemaBuilder, SchemaBuilderConfig} from "@gqldm/schema-builder";
import {exit} from "node:process";
import {writeFile} from "node:fs/promises";
import {printSchema} from "graphql";

export async function buildSchema(config: IntrospectorDatabaseConfig, outputPath: string = './schema.graphql') {
    const schemaBuilderConfig: SchemaBuilderConfig = {
        introspectorDatabaseConfig: config
    }
    console.log('🏁 Build database schema to graphql...');
    const schemaBuilder = new SchemaBuilder(schemaBuilderConfig);
    const gqlSchema = await schemaBuilder.buildSchema()
    if (!gqlSchema) {
        console.error('❌ Failed to build schema.');
        exit(1);
    }
    const schemaResult = printSchema(gqlSchema);
    await writeFile(outputPath, schemaResult, 'utf-8');
    console.log(`✅ build completed successfully. Saved to ${outputPath}`);
}