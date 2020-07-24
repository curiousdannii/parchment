import buffer from 'vinyl-buffer'
import cleanCSS from 'gulp-clean-css'
import commonjs from 'rollup-plugin-commonjs'
import gulp from 'gulp'
import rename from 'gulp-rename'
import rollup from '@rollup/stream'
import source from 'vinyl-source-stream'
import terser from 'gulp-terser'

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
                    commonjs(),
                ],
            })
                .pipe(source(`${file[0]}.js`))
                .pipe(buffer())
                .pipe(terser())
                .pipe(gulp.dest(opt.dest))
        })
        return taskname
    })
}

const buildweb = gulp.parallel(
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
            ['main', './src/inform7/index.js'],
            ['quixe', './src/inform7/quixe.js'],
            ['zvm', './src/inform7/zvm.js'],
        ],
        format: 'es',
        target: 'web',
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

const build = gulp.parallel(buildweb, buildinform7)

export default build