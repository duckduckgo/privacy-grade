const listManager = require('./shared/list-manager')
const program = require('commander')
const fs = require('fs')
const execSync = require('child_process').execSync
const chalk = require('chalk')

const Grade = require('../src/classes/grade')
const https = require('../src/https')
const privacyPolicy = require('../src/privacy-policy')
const scriptUtils = require('./shared/utils')

program
    .option('-l, --left <name>', 'left directory name')
    .option('-r, --right <name>', 'right directory name')
    .option('-o, --output <name>', 'tbd... for now just writes to stdout')
    .option('-f, --file <name>', 'tbd.. for now just uses contents of left directory')
    .parse(process.argv)

const left = program.left
const right = program.right
const leftInputPath = `${left}-grades`
const rightInputPath = `${right}-grades`
const output = program.output
const outputPath = `${output}-grades`

if (!left || !right || !output) {
    return program.help()
}

const run = () => {


    let leftDataFileList = fs.readdirSync(leftInputPath)

    console.log('url,left site,right site,site score diff,left enhanced,right enhanced,enhanced score diff')

    leftDataFileList.forEach( fn => {
        if (/^\./.test(fn)) {
            // console.log(chalk.red(`skip ${fn}`))
            return
        }

        let leftfn = `${left}-grades/${fn}`
        let rightfn = `${right}-grades/${fn}`

        // let re = fs.existsSync(rightfn) ? chalk.green('yes') : chalk.red('no')


        try {

        let leftGrade = JSON.parse(fs.readFileSync(leftfn, { encoding: 'utf8' }))
        let rightGrade = JSON.parse(fs.readFileSync(rightfn, { encoding: 'utf8' }))

        let l = leftGrade.score
        let r = rightGrade.score


        let siteDiff = r.site.score - l.site.score
        let enhancedDiff = r.enhanced.score - l.enhanced.score

        console.log(`${fn},${l.site.grade},${r.site.grade},${siteDiff},${l.enhanced.grade},${r.enhanced.grade},${enhancedDiff}`)

        } catch (e) {
            console.log(chalk.red(`error for ${fn}, skipping`))
        }

    })

}


run()
