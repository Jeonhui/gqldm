import {Introspector, IntrospectorDatabaseConfig} from "@gqldm/schema-builder";
import {exit} from "node:process";

export async function introspect(config: IntrospectorDatabaseConfig) {
    const introspector = new Introspector(config)
    console.log('🏁 Introspecting database schema...');
    try {
        const result = await introspector.introspect()
        console.log(result)
    } catch (error) {
        console.error('❌ Error during introspection:', error);
        exit(1)
    }
    console.log('✅ Introspection completed successfully.');
}