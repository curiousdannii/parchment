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
                    format: opt.format,
                },
                plugins: [
                    alias({
                        entries: [
                            { find: 'crypto', replacement: '../../../common/dummy-node.js' },
                            { find: 'fs', replacement: '../../../common/dummy-node.js' },
                            { find: 'path', replacement: '../../../common/dummy-node.js' },
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
        src: './src/upstream/emglken/build/*(glulxe|tads)-core.wasm',
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
            ['ie', './src/common/ie.js'],
            ['glulxe', './src/upstream/emglken/src/glulxe.js'],
            ['main', './src/common/launcher.js'],
            ['quixe', './src/common/quixe.js'],
            ['tads', './src/upstream/emglken/src/tads.js'],
            ['zvm', './src/common/zvm.js'],
        ],
        format: 'es',
        target: 'web',
    }),
)

const buildifcomp = gulp.parallel(
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

export default buildweb
export {
    buildifcomp as ifcomp,
    buildinform7 as inform7,
    buildweb as web,
}