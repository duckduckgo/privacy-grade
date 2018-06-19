const program = require('commander')
const glob = require('glob')
const fs = require('fs')
const chalk = require('chalk')
const diff = require('deep-diff').diff

program
    .option('-a, --dirA <name>', 'Directory of results')
    .option('-b, --dirB <name>', 'Directory of results')
    .option('-o, --output <name>', 'Output name, e.g. "test" will output files at "test-sites"')
    .parse(process.argv)

const fileName = program.file
const output = program.output
const outputPath = `${output}-sites`

let combinedFiles = {}
getFiles(program.dirA).then(() => {
    getFiles(program.dirB).then(() => {
        processFiles()
    })
})

function logDiffs (diffs, site) {
    let diffToCareAbout = ['before', 'after', 'totalBlocked', 'trackersBlocked']
    let diffToIgnore = ['rule', 'origURL', 'reason', 'type']
    let toLog = []

    diffs.forEach(diff => {
        if (diffToCareAbout.includes(diff.path[0])) {
            let log = true

            // check ignore 
            diffToIgnore.forEach(ignore => {
                if (diff.path.includes(ignore)) {
                    log = false
                    return
                }
            })

            if (log) toLog.push(diff)
        }
    })

    if (toLog.length) {
        console.log(`Diffs for ${site}`)
        console.log(toLog)
    }

}

function getFiles (dirName) {
    return new Promise ((res, rej) => {
            glob(dirName + "/*.json", (err, files) => {
                if (!err) {
                    files.forEach(path => {
                        let fileName = path.replace(dirName + '/', '')
                        addFile(fileName, path)
                    })
                    res()
                } else {
                    console.log(err)
                }
            })
    })
}

function addFile (name, path) {
    if (!combinedFiles[name]) {
        combinedFiles[name] = []
    }
    combinedFiles[name].push(path)
}

function processFiles () {
    Object.keys(combinedFiles).forEach(fileName => {
        if (combinedFiles[fileName].length < 2) {
            //console.log(combinedFiles[fileName])
            //console.log(`missing file: ${combinedFiles[fileName]}`)
            return
        }

        processFile(fileName)
    })
}

function processFile (fileName) {
    let dataA = getDataFromFile(combinedFiles[fileName][0])
    let dataB = getDataFromFile(combinedFiles[fileName][1])

    if (!dataA || !dataB) {
        console.log(`missing file for ${dataA}`)
    }

    let diffs = diffResult(dataA, dataB)

    if (diffs) logDiffs(diffs, fileName) 
}

function getDataFromFile (name) {
    return JSON.parse(fs.readFileSync(name, 'utf8'));
}

function diffResult (a, b) {
    return diff(a,b)
}

