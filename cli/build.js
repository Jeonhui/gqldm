import esbuild from 'esbuild';
import pkg from './package.json' with {type: 'json'};

esbuild
    .build({
        entryPoints: ['./src/cli/index.ts'],
        outfile: './bin/index.js',
        bundle: true,
        write: true,
        treeShaking: true,
        minify: true,
        format: 'esm',
        platform: 'node',
        target: ['node16'],
        external: [...Object.keys(pkg.dependencies)],
        banner: {
            js: '#!/usr/bin/env node',
        },
    })
    .catch(() => process.exit(1));
