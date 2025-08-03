import esbuild from 'esbuild';
import pkg from './package.json' with {type: 'json'};

esbuild.build({
    entryPoints: ['./src/index.ts'],
    outdir: './dist',
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: ['node16'],
    sourcemap: true,
    external: [...Object.keys(pkg.dependencies || {})],
    minify: false,
    splitting: false,
    tsconfig: 'tsconfig.json',
}).catch(() => process.exit(1));
