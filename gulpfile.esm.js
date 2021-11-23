import alias from '@rollup/plugin-alias'
import buffer from 'vinyl-buffer'
import cleanCSS from 'gulp-clean-css'
import commonjs from 'rollup-plugin-commonjs'
import gulp from 'gulp'
import rename from 'gulp-rename'
import rollup from '@rollup/stream'
import source from 'vinyl-source-stream'
import terser from 'gulp-terser'

function copy(opt)
{
    const taskname = `${opt.target}-copy`
    gulp.task(taskname, () => {
        return gulp.src(opt.src)
            .pipe(gulp.dest(opt.dest))
    })
    return taskname
}

function css(opt)
{
    const taskname = `${opt.target}-css`
    gulp.task(taskname, () => {
        return gulp.src(opt.src)
            .pipe(rename(opt.output))
            .pipe(cleanCSS())
            .pipe(gulp.dest(opt.dest))
    })
    return taskname
}

function js(opt)
{
    const terser_opts = {
        module: opt.format === 'es',
        toplevel: true,
    }

    return opt.files.map(file => {
        const taskname = `${opt.target}-js-${file[0]}`
        gulp.task(taskname, () =>{
            return rollup({
                input: file[1],
                onwarn: (warning, warn) => {
                    if (warning.code === 'EVAL') return
                    warn(warning)
                },
                output: {
                    exports: 'auto',
                    format: opt.format,
                },
                plugins: [
                    alias({
                        entries: [
                            { find: 'crypto', replacement: '../../../src/common/dummy-node.js' },
                            { find: 'fs', replacement: '../../../src/common/dummy-node.js' },
                            { find: 'path', replacement: '../../../src/common/dummy-node.js' },
                        ]
                    }),
                    commonjs(),
                ],
            })
                .pipe(source(`${file[0]}.js`))
                .pipe(buffer())
                .pipe(terser(terser_opts))
                .pipe(gulp.dest(opt.dest))
        })
        return taskname
    })
}

const buildweb = gulp.parallel(
    copy({
        dest: 'dist/web/',
        src: './node_modules/emglken/build/*-core.wasm',
        target: 'web',
    }),
    css({
        dest: 'dist/web/',
        output: 'web.css',
        src: './src/web/web.css',
        target: 'web',
    }),
    ...js({
        dest: 'dist/web/',
        files: [
            ['git', './node_modules/emglken/src/git.js'],
            ['glulxe', './node_modules/emglken/src/glulxe.js'],
            ['hugo', './node_modules/emglken/src/hugo.js'],
            ['ie', './src/common/ie.js'],
            ['main', './src/common/launcher.js'],
            ['quixe', './src/common/quixe.js'],
            ['tads', './node_modules/emglken/src/tads.js'],
            ['zvm', './src/common/zvm.js'],
        ],
        format: 'es',
        target: 'web',
    }),
)

const buildifcomp = gulp.parallel(
    copy({
        dest: 'dist/ifcomp/',
        src: './node_modules/emglken/build/tads-core.wasm',
        target: 'ifcomp',
    }),
    css({
        dest: 'dist/ifcomp/',
        output: 'web.css',
        src: './src/web/web.css',
        target: 'ifcomp',
    }),
    ...js({
        dest: 'dist/ifcomp/',
        files: [
            ['ie', './src/common/ie.js'],
            ['main', './src/common/launcher.js'],
            ['quixe', './src/common/quixe.js'],
            ['tads', './node_modules/emglken/src/tads.js'],
            ['zvm', './src/common/zvm.js'],
        ],
        format: 'es',
        target: 'ifcomp',
    }),
)

const buildinform7 = gulp.parallel(
    css({
        dest: 'dist/inform7/Parchment/',
        output: 'parchment.css',
        src: './src/inform7/inform7.css',
        target: 'inform7',
    }),
    ...js({
        dest: 'dist/inform7/Parchment/',
        files: [
            ['ie', './src/common/ie.js'],
            ['main', './src/inform7/index.js'],
            ['quixe', './src/inform7/quixe.js'],
            ['zvm', './src/inform7/zvm.js'],
        ],
        format: 'iife',
        target: 'inform7',
    }),
)

const buildlectrote = gulp.parallel(
    copy({
        dest: 'dist/lectrote/',
        src: './node_modules/emglken/build/*-core.wasm',
        target: 'lectrote',
    }),
    ...js({
        dest: 'dist/lectrote/',
        files: [
            ['git', './node_modules/emglken/src/git.js'],
            ['glulxe', './node_modules/emglken/src/glulxe.js'],
            ['hugo', './node_modules/emglken/src/hugo.js'],
            ['tads', './node_modules/emglken/src/tads.js'],
        ],
        format: 'cjs',
        target: 'lectrote',
    }),
)

export default buildweb
export {
    buildifcomp as ifcomp,
    buildinform7 as inform7,
    buildweb as web,
    buildlectrote as lectrote,
}