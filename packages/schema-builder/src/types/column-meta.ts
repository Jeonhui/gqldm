import {ForeignKeyMeta} from "./foreign-key-meta";

export type ColumnMeta = {
    column: string;
    dataType: string;
    isNullable: boolean;
    foreign?: ForeignKeyMeta
}