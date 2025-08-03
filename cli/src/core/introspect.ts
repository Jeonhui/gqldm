import {Introspector, IntrospectorDatabaseConfig} from "@gqldm/schema-builder";
import {exit} from "node:process";
import {writeFile} from "node:fs/promises";

export async function introspect(config: IntrospectorDatabaseConfig, outputPath: string = './output.graphql') {
    const introspector = new Introspector(config)
    console.log('🏁 Introspecting database schema...');
    try {
        const result = await introspector.introspect()
        const tableMetaResults = JSON.stringify({
            [config.database || 'database']: result
        }, null, 2)
        await writeFile(outputPath, tableMetaResults, 'utf-8');
    } catch (error) {
        console.error('❌ Error during introspection:', error);
        exit(1)
    }
    console.log('✅ Introspection completed successfully.');
}