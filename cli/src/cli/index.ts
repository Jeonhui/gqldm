import {Command} from "commander";
import {introspect} from "../core/introspect";
import {readFile} from "node:fs/promises";
import {buildSchema} from "../core/build-schema";
import {exit} from "node:process";

const program = new Command();

type CommandOptionsType = { [key in string]: string }

program
    .name("GQLDM")
    .description("GQLDM(GraphQL Database Middleware) CLI")

program
    .command("introspect")
    .description("Introspect the database schema")
    .option('-c, --config <path>', 'path to database config file (config.json)', './config.json')
    .option('-o, --output <path>', 'path to output graphql file (output.graphql)', './output.graphql')
    .action(async (options: CommandOptionsType) => {
        const config = await readFile(options.config, 'utf-8')
            .then(data => JSON.parse(data))
            .catch(e => {
                console.error(e);
                exit(1);
            });
        const outputPath = options.output;
        await introspect(config, outputPath)
    });

program
    .command("build-schema")
    .description("Build GraphQL schema from database")
    .option('-c, --config <path>', 'path to database config file (config.json)', './config.json')
    .option('-o, --output <path>', 'path to output graphql file (output.graphql)', './output.graphql')
    .action(async (options: CommandOptionsType) => {
        const config = await readFile(options.config, 'utf-8')
            .then(data => JSON.parse(data))
            .catch(e => {
                console.error(e);
                exit(1);
            });
        const outputPath = options.output;
        await buildSchema(config, outputPath)
    });

program.parse();