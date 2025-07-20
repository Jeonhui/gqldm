import {Command} from "commander";
import {introspect} from "../core/introspect";
import {readFile} from "node:fs/promises";
import {buildSchema} from "../core/build-schema";

const program = new Command();

type CommandOptionsType = { [key in string]: string }

program
    .name("GQLDM")
    .description("GQLDM(GraphQL Database Middleware) CLI")

program
    .command("init")
    .description("Initialize something")
    .action(() => {
        console.log("Init command executed");
    });

program
    .command("introspect")
    .description("Introspect the database schema")
    .option('-c, --config <path>', 'path to database config.json file', './config.json')
    .action(async (options: CommandOptionsType) => {
        try {
            const data = await readFile(options.config, 'utf-8');
            const config = JSON.parse(data);
            await introspect(config)
        } catch (err) {
            console.error('Failed to read config.json file:', err);
        }
    });

program
    .command("build-schema")
    .description("Build GraphQL schema from database")
    .option('-c, --config <path>', 'path to database config.json file', './config.json')
    .action(async (options: CommandOptionsType) => {
        const data = await readFile(options.config, 'utf-8');
        const config = JSON.parse(data);
        await buildSchema(config)
    });

program.parse();