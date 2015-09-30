'use strict';

var gulp = require('gulp'),
	debug = require('gulp-debug'),
	del = require('del'),
	concat = require('gulp-concat'),
	sourcemaps = require('gulp-sourcemaps'),
	uglify = require('gulp-uglify'),
	minifyCss = require('gulp-minify-css'),
	ngAnnotate = require('gulp-ng-annotate'),
	less = require('gulp-less'),
	zip = require('gulp-zip');

var paths = {
	move: [
        'src/popup/html/**/*.html',
        'src/images/**/*',
        'bower_components/bootstrap/fonts/*.{eot,svg,ttf,woff,woff2}',
        'bower_components/bootstrap-material-design/fonts/Material-Design-Icons.{eot,svg,ttf,woff,woff2}',
        'bower_components/angular-ui-grid/*.{eot,svg,ttf,woff,woff2}',
    ],
	background: [
        'bower_components/jquery/dist/jquery.min.js',
        'src/js/**/*.js',
        'src/background/storeManager.js',
        'src/background/requestManager.js',
        'src/background/priorityQueue.js',
        'src/background/background.js',
        'src/background/sites/**/*.js'
    ],
	libs: [
        'bower_components/angular/angular.min.js',
        'bower_components/angular-i18n/angular-locale_pt-br.js',
        'bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
        'bower_components/angular-sanitize/angular-sanitize.min.js',
        'bower_components/angular-ui-grid/ui-grid.min.js',
        'bower_components/gm.datepickerMultiselect/dist/gm.datepickerMultiselect.min.js',
        'bower_components/ui-select/dist/select.min.js',
    ],
	scripts: [
        'src/popup/app.module.js',
        'src/popup/app.[^module]*.js',
        'src/popup/filters/**/*.js',
    ],
	less: 'src/popup/app.less',
};

var distPaths = {
	dest: 'dist',
	background: 'background.js',
	libs: 'libs.js',
	scripts: 'app.js',
	css: 'app.css',
};

// Clean dist folder
gulp.task('clean', function () {
	return del([distPaths.dest + '/*']).then(function (deletedPaths) {
		console.log('Deleted files/folders:\n', deletedPaths.join('\n'));
	});
});

// Move non-processing files to dist (fonts, html, images, ...)
gulp.task('move', function () {
	return gulp.src(paths.move)
		.pipe(debug({
			title: 'Moved file:'
		}))
		.pipe(gulp.dest(distPaths.dest));
});

// Concat, minify and create sourcemaps for background scripts
gulp.task('background', function () {
	return gulp.src(paths.background)
		.pipe(debug({
			title: 'Concat file to background:'
		}))
		//.pipe(sourcemaps.init())
		.pipe(concat(distPaths.background))
		.pipe(uglify())
		//.pipe(sourcemaps.write())
		.pipe(gulp.dest(distPaths.dest))
});

// Concat 3rd party libs
gulp.task('popup:libs', function () {
	return gulp.src(paths.libs)
		.pipe(debug({
			title: 'Concat file to libs:'
		}))
		.pipe(concat(distPaths.libs))
		.pipe(gulp.dest(distPaths.dest))
});

// Concat, minify and create sourcemaps for app scripts
gulp.task('popup:js', function () {
	return gulp.src(paths.scripts)
		.pipe(debug({
			title: 'Concat file to js:'
		}))
		//.pipe(sourcemaps.init())
		.pipe(ngAnnotate().on('error', function (err) {
			console.log(err);
		}))
		.pipe(concat(distPaths.scripts))
		.pipe(uglify())
		//.pipe(sourcemaps.write())
		.pipe(gulp.dest(distPaths.dest))
});

// Compile less and minify css
gulp.task('popup:css', function () {
	return gulp.src(paths.less)
		.pipe(debug({
			title: 'Less file:'
		}))
		.pipe(less())
		.pipe(minifyCss())
		.pipe(gulp.dest(distPaths.dest))
});

// Rerun the task when a file changes
gulp.task('watch', ['build'], function () {
	gulp.watch(paths.move, ['move']);
	gulp.watch(paths.background, ['background']);
	gulp.watch(paths.libs, ['popup:libs']);
	gulp.watch(paths.scripts, ['popup:js']);
	gulp.watch(paths.less, ['popup:css']);
});

// The deployment task (no need for watch)
gulp.task('build', ['clean', 'move', 'background', 'popup:libs', 'popup:js', 'popup:css']);

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['build', 'watch']);

// Zip manifest and dist folder to deploy the app
gulp.task('zip', ['build'], function () {
	return gulp.src(['manifest.json', '_locales/**/*', distPaths.dest + '/*'], {
			base: '.'
		})
		.pipe(debug({
			title: 'Zip file:'
		}))
		.pipe(zip('deploy.zip'))
		.pipe(gulp.dest(distPaths.dest));
});
