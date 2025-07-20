import mysql, {type ConnectionOptions} from 'mysql2/promise';
import {Client as PostgresClient, type ClientConfig} from 'pg';
import {exit} from "node:process";
import {ForeignKeyMeta, TableMeta} from "../types";

export type MySqlConfig = ConnectionOptions
export type PostgresConfig = ClientConfig

export type IntrospectorDatabaseConfig =
    | (MySqlConfig & { type: 'mysql' })
    | (PostgresConfig & { type: 'postgres' });

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
        } else if (this.config.type === 'postgres') {
            return this.introspectPostgres();
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

            const fks: ForeignKeyMeta[] = (foreignKeys as any[]).map(fk => ({
                column: fk.COLUMN_NAME,
                referencedTable: fk.REFERENCED_TABLE_NAME,
                referencedColumn: fk.REFERENCED_COLUMN_NAME,
            }));

            result.push({
                table: tableName,
                columns: (columns as any[]).map(col => ({
                    column: col.COLUMN_NAME,
                    dataType: col.DATA_TYPE,
                    isNullable: col.IS_NULLABLE === 'YES',
                })),
                foreignKeys: fks.length ? fks : undefined,
            });
        }

        await connection.end();
        return result;
    }

    private async introspectPostgres() {
        if (this.config.type !== 'postgres') {
            throw new Error(`Expected Postgres config, got: ${(this.config as any).type}`);
        }

        const client = new PostgresClient({
            host: this.config.host,
            port: this.config.port,
            user: this.config.user,
            password: this.config.password,
            database: this.config.database,
        });
        await client.connect();

        const tablesRes = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
        `);

        const result: TableMeta[] = [];

        for (const row of tablesRes.rows) {
            const tableName = row.table_name;

            const columnsRes = await client.query(
                `
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = $1
                `,
                [tableName],
            );

            result.push({
                table: tableName,
                columns: columnsRes.rows.map(col => ({
                    column: col.column_name,
                    dataType: col.data_type,
                    isNullable: col.is_nullable === 'YES',
                })),
            });
        }

        await client.end();
        return result;
    }
}