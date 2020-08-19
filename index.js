#!/usr/bin/env node
//todo sourcemaps and semver and stdin
const sass = require('sass');
const path = require('path');
const fs = require('fs');
const fg = require('fast-glob');
const picomatch = require('picomatch');
const version = require('./package.json').version;
const parser = require('./parser');
const { Command } = require('commander');
const postcss = require('postcss');
const program = new Command();


let input, output;

program.version(version, '-v, --version', 'Print the version of Sheetloaf.');
// Angled brackets denote required argument, square denote optional
program
    .arguments('<source> <out>') // can change source to []
    .description('🍖 Compile Sass to CSS and transform the output using PostCSS all in one command.')
    .action((source, out) => {
        input = source;
        output = out;
    });
program
    .option('-s, --style <NAME>', 'Output style. ["expanded", "compressed"]', 'expanded')
    .option('--no-source-map', 'Whether to generate source maps.')
    .option('-w, --watch', 'Watch stylesheets and recompile when they change.')
    .option('--config <LOCATION>', 'Set a custom directory to look for a postcss config file.')
    .option('-u, --use <PLUGINS>', 'List of postcss plugins to use. Will cause sheetloaf to ignore any config files.');
program.parse(process.argv);


let postcssConfig = {
    plugins: []
};
if (program.use !== undefined) {
    // If user specifies --use, ignore postcss config files.
    program.use.split(',').forEach(function (plugin) {
        postcssConfig.plugins.push(require(plugin));
    });
} else {
    postcssConfig = parser.getPostCSSConfig(program.config);
}

parser.parseInput(input, function (entries) {
    entries.forEach(function (filename) {
        if (path.basename(filename).charAt(0) !== '_') {
            renderSheet(filename);
        }
    });
});

function renderSheet(filename) {
    console.log(`Rendering ${filename}...`)
    let destination = parser.parseDestination(filename, input, output);

    //When using Dart Sass, renderSync() is more than twice as fast as render(), due to the overhead of asynchronous callbacks.
    /*let result = sass.renderSync({
        file: filename,
        sourceMap: true,
        sourceMapEmbed: true,
        outFile: destination,
        outputStyle: program.style
    });*/

    sass.render({
        file: filename,
        sourceMap: program.sourceMap,
        sourceMapEmbed: program.sourceMap,
        outFile: destination,
        outputStyle: program.style
    }, function (err, result) {
        if (err === null) {
            postcss(postcssConfig.plugins).process(result.css.toString(), {
                from: result.stats.entry,
                to: destination,
                map: program.sourceMap
            }).then(postedResult => {
                try {
                    fs.mkdirSync(path.dirname(destination), { recursive: true });
                } catch (err) {
                    if (err.code !== 'EEXIST' || err.code !== 'EISDIR') throw err
                }

                fs.writeFile(destination, postedResult.css, (err) => {
                    // throws an error, you could also catch it here
                    if (err) throw err;

                    // success case, the file was saved
                    console.log(`Successfully written to ${destination}`);
                })
            }).catch(err => {
                console.log(err);
            })
        } else {
            console.log(err.formatted);
        }
    });
}



















































/*
// Skip the first two, I don't care.
const args = process.argv.slice(2);
console.log(args);

let input = args[0];
let output = parser.getOutput(args);
let watchFiles = parser.checkForOption(args, ['--watch', '-w']);
let minifyOutput = parser.checkForOption(args, ['--style=compressed']);


let inputIsGlob = picomatch.scan(input).isGlob;

// let fast-glob deal with resolving the path, idk why but it doesn't like it
// when I do it beforehand, specifically on windows command prompt.
// POSIX works just fine with it.
let entries = fg.sync([input], { dot: true });
console.log(`Globbed entries: ${entries}`);

entries.forEach(function (filename) {
    if (path.basename(filename).charAt(0) !== '_') {
        renderSheet(filename);
    }
});

function renderSheet(filename) {
    let destination;
    if (inputIsGlob === true) {
        destination = path.resolve(process.cwd(), output, path.basename(filename, '.scss') + '.css');
    } else {
        destination = path.resolve(process.cwd(), output);
    }

    //When using Dart Sass, renderSync() is more than twice as fast as render(), due to the overhead of asynchronous callbacks.
    let result = sass.renderSync({
        file: filename,
        sourceMap: true,
        sourceMapEmbed: true,
        outFile: destination,
        outputStyle: (minifyOutput ? 'compressed' : 'expanded')
    });

    try {
        fs.mkdirSync(path.dirname(destination), { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err
    }

    fs.writeFile(destination, result.css, (err) => {
        // throws an error, you could also catch it here
        if (err) throw err;

        // success case, the file was saved
        console.log('file saved!');
    })
}

//console.log(`command executed from: ${process.cwd()}`);
//console.log(`resolved path: ${path.resolve(process.cwd(), input)}`);


// sass.render({
//     file: args[0],
//     sourceMap: true,
//     sourceMapEmbed: true,
//     outFile: destination
// }, function (err, result) {
//     console.log(result);
// });*/

/*if (args.includes('--watch') || args.includes('-w')) {
    console.log(`I'd watch your file if that feature was included.`)
}

if (args.includes('--dir') || args.includes('-d')) {
    let dir = args[(args.indexOf('--dir') !== -1 ? args.indexOf('--dir') + 1 : args.indexOf('-d') + 1)];
    console.log(`I'd output your file to ${dir} that feature was included.`)
}*/