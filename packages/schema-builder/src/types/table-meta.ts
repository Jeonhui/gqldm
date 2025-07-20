import {ColumnMeta} from "./column-meta";
import {ForeignKeyMeta} from "./foreign-key-meta";

export type TableMeta = {
    table: string;
    columns: ColumnMeta[];
    foreignKeys?: ForeignKeyMeta[];
}