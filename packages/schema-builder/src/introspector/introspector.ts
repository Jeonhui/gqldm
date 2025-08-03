import mysql, {type ConnectionOptions} from 'mysql2/promise';
import {Client as PostgresClient, type ClientConfig} from 'pg';
import {exit} from "node:process";
import {ColumnMeta, ForeignKeyMeta, TableMeta} from "../types";

export type MySqlConfig = ConnectionOptions
// export type PostgresConfig = ClientConfig

export type IntrospectorDatabaseConfig =
    | (MySqlConfig & { type: 'mysql' });

// | (PostgresConfig & { type: 'postgres' });

export class Introspector {
    private readonly config: IntrospectorDatabaseConfig

    constructor(config: IntrospectorDatabaseConfig) {
        const availableDBTypes = ['mysql', 'postgres'] as const;
        if (!config || !config.type || !availableDBTypes.includes(config.type as any)) {
            throw new Error(`Invalid configuration provided Or Unsupported database type: ${(config as any).type}`);
        }
        this.config = config;
    }

    async introspect() {
        if (this.config.type === 'mysql') {
            return this.introspectMySql();
            // } else if (this.config.type === 'postgres') {
            //     return this.introspectPostgres();
        } else {
            throw new Error(`Unsupported database type: ${(this.config as any).type}`);
        }
    }

    private async introspectMySql() {
        if (this.config.type !== 'mysql') {
            throw new Error(`Expected Postgres config, got: ${(this.config as any).type}`);
        }
        const connection = await mysql.createConnection({
            host: this.config.host,
            port: this.config.port,
            user: this.config.user,
            password: this.config.password,
            database: this.config.database,
        });

        const [tables] = await connection.execute(
            `SELECT TABLE_NAME
             FROM INFORMATION_SCHEMA.TABLES
             WHERE TABLE_SCHEMA = ?`,
            [this.config.database]
        );

        const result: TableMeta[] = [];

        for (const row of tables as any[]) {
            const tableName = row.TABLE_NAME;

            const [columns] = await connection.execute(
                `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                 FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = ?
                   AND TABLE_NAME = ?`,
                [this.config.database, tableName]
            );

            const [foreignKeys] = await connection.execute(
                `SELECT COLUMN_NAME,
                        REFERENCED_TABLE_NAME,
                        REFERENCED_COLUMN_NAME
                 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                 WHERE TABLE_SCHEMA = ?
                   AND TABLE_NAME = ?
                   AND REFERENCED_TABLE_NAME IS NOT NULL`,
                [this.config.database, tableName]
            );

            const fksDict: Record<string, ForeignKeyMeta> = (foreignKeys as any[]).reduce((acc, fk) => {
                acc[fk.COLUMN_NAME] = {
                    column: fk.COLUMN_NAME,
                    referencedTable: fk.REFERENCED_TABLE_NAME,
                    referencedColumn: fk.REFERENCED_COLUMN_NAME,
                };
                return acc;
            }, {} as Record<string, ForeignKeyMeta>);

            const columnsMeta: ColumnMeta[] = (columns as any[]).map(col => ({
                column: col.COLUMN_NAME,
                dataType: col.DATA_TYPE,
                isNullable: col.IS_NULLABLE === 'YES',
                foreign: fksDict[col.COLUMN_NAME] || undefined
            }))
            result.push({
                table: tableName,
                columns: columnsMeta,
            });
        }

        await connection.end();
        return result;
    }
}