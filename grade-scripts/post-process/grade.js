const fs = require('fs');
const program = require('commander')
const log = console.log;
const chalk = require('chalk');
// const name = process.argv[2];
//    csvHeaders = 'domain,requests,initial,is major,tosdr,in major,https,obscure,blocked,total,grade\n'
const csvHeaders = 'domain,req blocked,site pscore,blocked score,unblocked score,https-e,https-s,tosdr,polisis,calculated privacy,site,enhanced,site grade, enhanced grade'


program
    .option('-i, --input <name>', 'The name to use when looking for sites, e.g. "test" will look in "test-sites"')
    .option('-o, --output <name>', 'Output name, e.g. "test" will output files at "test-grades"')
    .option('-f, --file <name>', 'Allow processing a subset of dumped site data, defined in a file')
    .parse(process.argv)


const input = program.input
const output = program.output
const fileList = program.file

const inputPath = `${process.cwd()}/${input}-grades/`;

const csvPath  = `${output}.csv`;
const histPath = `${output}.hist.csv`;
const hist_ePath = `${output}.hist-e.csv`;
const hist_gradesPath = `${output}.hist-grades.csv`;
const examplesPath = `${output}.examples.csv`;

const prev = require('./prev')
const polisisMap = require('../../data/generated/polisismap')
const tosdrScores = require('../../data/generated/tosdr-scores')  //('./tosdr-scores')

const privacyUnknown = 2



/* wip
const defaults {
    // unknownPrivacy: 2,
    privacy: {
        unknown: 2
    },
    https: {
        full: 0,
        noAutoUpgrade: 3,
        none: 10
    },
    trackerTresholds: [
        0,      // 0
        0.1,    // 1
        1,      // 2
        5,      // 3
        10,     // 4
        15,     // 5
        20,     // 6
        30,     // 7
        45,     // 8
        66      // 9
    ]
}
*/

let hist = new Array(100)
let hist_e = new Array(100)


// Create a Set of sites that support https autoupgrade
// Until this is available on an endpoint, we're reading it for test purposes from the cwd
// this might be big..
let autext = fs.readFileSync("https_autoupgrade_list.txt", "utf8")
let autoUpgrade = new Set (autext.split(/\r?\n/))


// store examples of site grades, enhanced grades, and grade spans
let examples = {
    c: { }, // site counts
    ce: { }, // enhanced counts
    spanc: { }, // span counts
    s: { }, // site grades
    e: { }, // enhanced grades
    span: { } // A_B, D-_C, etc.
}



const appendLine = (fn,text) => {
    try {
        fs.appendFileSync(fn, text)
    }
    catch (err) {
        console.log(chalk.red(`error writing to ${fn}`))
    }
}


var trackerScore = (site) => {

    // console.log(`---\n${site.domain} => ${Object.keys(site.trackersBlocked).length} parent: ${site.parentCompany}`)

    let parent = 0

    if (site.parentCompany) {
        parent = prev[site.parentCompany] || 0

        // if (parent)
        //     site.trackersNotBlocked[

        if (!site.trackersNotBlocked[site.parentCompany])
            site.trackersNotBlocked[site.parentCompany] = { } // contents irrelevant for normalizeTracker

    }


    let normalizeTracker = (p) => {

        if (!p)
            return 0

        // baseline min
        if (p < .1)
            return 1

        if (p < 1)
            return 2

        if (p < 5)
            return 3

        // 1 - 5
        if (p < 10)
            return 4

        if (p < 15)
            return 5

        if (p < 20)
            return 6

        if (p < 30)
            return 7

        if (p < 45)
            return 8

        if (p < 66)
            return 9

        return 10
    }

    let bl = (l) => {
        if (!l)
            return 0

        let s = 0
        Object.keys(l).forEach( co => {

            let p = prev[co] || 1 // minimum of 1
            let np = normalizeTracker(p)

            // console.log(`   ${co}: ${p} -> ${np}`)

            s += np

        })
        return s
    }

    return {
        b: bl(site.trackersBlocked),
        n: bl(site.trackersNotBlocked),
        site: normalizeTracker(parent)

    }
}

let hist_grades = {
    'A+': 0,
    'A': 0,
    'A-': 0,
    'B': 0,
    'B+': 0,
    'B-': 0,
    'C+': 0,
    'C': 0,
    'C-': 0,
    'D+': 0,
    'D': 0,
    'D-': 0,
    'F': 0
}

let hist_grades_e = {
    'A+': 0,
    'A': 0,
    'A-': 0,
    'B': 0,
    'B+': 0,
    'B-': 0,
    'C+': 0,
    'C': 0,
    'C-': 0,
    'D+': 0,
    'D': 0,
    'D-': 0,
    'F': 0
}

let old_grades = {
    'A+': 0,
    'A': 0,
    'A-': 0,
    'B': 0,
    'B+': 0,
    'B-': 0,
    'C+': 0,
    'C': 0,
    'C-': 0,
    'D+': 0,
    'D': 0,
    'D-': 0,
    'F': 0
}

let old_grades_e = {
    'A+': 0,
    'A': 0,
    'A-': 0,
    'B': 0,
    'B+': 0,
    'B-': 0,
    'C+': 0,
    'C': 0,
    'C-': 0,
    'D+': 0,
    'D': 0,
    'D-': 0,
    'F': 0
}

let testDump = [
]

// map score to grade
let gradeMap = {
    0: 'A',
    1: 'A',

    2: 'B+',
    3: 'B+',

    4: 'B',
    5: 'B',
    6: 'B',
    7: 'B',
    8: 'B',
    9: 'B',

    10:'C+',
    11:'C+',
    12:'C+',
    13:'C+',

    14:'C',
    15:'C',
    16:'C',
    17:'C',
    18:'C',
    19:'C',

    20:'D',
    21:'D',
    22:'D',
    23:'D',
    24:'D',
    25:'D',
    26:'D',
    27:'D',
    28:'D',
    29:'D',

    30:'D-'
}


// map grade to score
let scoreMap = { }
Object.keys(gradeMap).forEach( (s) => {
    scoreMap[gradeMap[s]] = s
})


// turn a score into a grade
let scoreToGrade= (s) => {
    var g = gradeMap[Math.round(s)]
    if (g)
        return g

    if (s > 30)
        return gradeMap[30]

}

/*
    let gradeToScore= (g) => {
        let s = scoreMap(g)

        if (s)
            return s

        console.log(`gradeToScore: '${g}' unknown or invalid`)

        return 'X'
    }
*/



let calculateGrade = (fileName) => {

    if (fileName.match(/^\./))
        return

    let siteName = fileName.replace(/\.json$/, '');

    if (!fs.existsSync(inputPath + fileName)) {
        console.log(chalk.red(`${inputPath + fileName} does not exist`))
        return
    }

    let jsonText = fs.readFileSync(inputPath + fileName, 'utf8');

    let site = JSON.parse(jsonText);

    site.domain = siteName

    if (!site.url || !site.decisions) {
        console.log(chalk.red(`error: missing site url or details for ${fileName}`));
        return;
    }

    let tscore = trackerScore(site)
    let score = {s:0, e: 0}
    let grade = 'X'

    /*
     * HTTPS
     */

    let https_e = 0 // enhanced component
    let https_s = 0 // site component

    let au = autoUpgrade.has(site.domain)

    // site is in the https auto upgrade list
    // this is good
    if (au) {
        https_s = 0 // no enhancement
    }
    // site has https, but no auto upgrade
    else if (site.hasHTTPS && !au) {
        https_e = 0  // enhance
        https_s = 3  // lower for site score
    }
    // no https, no auto upgrade
    else if (!site.hasHTTPS && !au) {
        https_e = 10 // bad score = no enhancement.
        https_s = 0  // don't double count
    }

    /*
     * privacy policy
     */

    let polisis = site.polisis || { good:0, bad:0}
    let privacy = 0 //site.tosdr ? site.tosdr.badScore : 0
    let tosdr = false
    
    // Polisis
    // use score for parent company if present
    // this is similar to the tracker network effect concept

    if (site.parentCompany && polisisMap[site.parentCompany]) {
        polisis.bad = polisisMap[site.parentCompany]
        // console.log(`polisis using parent company for ${site.domain} -> ${site.parentCompany}: ${polisis.bad}`)
    }
    else if (polisisMap[site.domain]) {
        polisis.bad = polisisMap[site.domain]
        // console.log(`polisis found for ${site.domain}: ${polisis.bad}`)
    }

    // ToS;DR

    if (site.parentCompany && tosdrScores[site.parentCompany])
        tosdr = tosdrScores[site.parentCompany][0]
    else if (tosdrScores[siteName]) {
        tosdr = tosdrScores[siteName][0]
        // console.log(chalk.green(`${siteName} tosdr: ${tosdr}`))
    }

    if (tosdr !== false) {
        privacy = tosdr
        // console.log(chalk.red(`Using TOSDR for ${siteName}: ${tosdr}`))
    }
    else
        privacy = polisis.bad

    let privacyForDump = privacy
 
    if (privacy > 10)
        privacy = 10

    // unknown privacy practices
    if (privacy === 0 && polisis.good === 0 && polisis.bad === 0) {
        privacy = privacyUnknown
        privacyForDump = null
    }

    /*
     * calculate final score
     */

    // enhanced score excludes blocked trackers
    //        blocked     site prev    https
    // score.e = tscore.n + tscore.site + https_e + privacy
    score.e = tscore.n + https_e + privacy

    // site score includes blocked trackers
    score.s = score.e + tscore.b + https_s

    let siteGrade = scoreToGrade(score.s)
    let enhancedGrade = scoreToGrade(score.e)

    /*
     *
     * collect histogram data
     *
     */

    // score.s_rounded = Math.round(score.s / 5, 1) * 5
    score.s_rounded = score.s

    // score.e_rounded = Math.round(score.e / 5, 1) * 5
    score.e_rounded = score.e

    if (!hist[score.s_rounded])
        hist[score.s_rounded] = 0
    hist[score.s_rounded] += 1;

    if (!hist_e[score.e_rounded])
        hist_e[score.e_rounded] = 0
    hist_e[score.e_rounded] += 1;


    if (!hist_grades[siteGrade])
        hist_grades[siteGrade] = 0
    hist_grades[siteGrade] += 1;

    if (!hist_grades_e[enhancedGrade])
        hist_grades_e[enhancedGrade] = 0
    hist_grades_e[enhancedGrade] += 1;

    if (!old_grades[site.before])
        old_grades[site.before] = 0
    old_grades[site.before] += 1;

    if (!old_grades_e[site.after])
        old_grades_e[site.after] = 0
    old_grades_e[site.after] += 1;


    /*
     *
     * output
     *
     */

    //               domain,      blocked,         site pscore,  blocked score,   unblocked score, https, tosdr, polisis, privacy ,      site,   enhanced,    grade, e grade\n'
    let csvtext = `${siteName},${site.totalBlocked},${tscore.site},${tscore.b},${tscore.n},${https_e},${https_s},${tosdr},${polisis.bad},${privacy},${score.s},${score.e},${siteGrade},${enhancedGrade}`

    // console.log(csvtext)

    appendLine(csvPath, `${csvtext}\n`)


    /*
     * record some examples
     * use random shuffling of input domains to produce
     * a variety of output examples.
     * eg shuf 25k.txt | head -500 > 500random.txt
     */
    let addToDump = false
   
    if (!examples.c[siteGrade])
        examples.c[siteGrade] = 0

    if (Math.random() < 0.01) {
        let exs = `${siteGrade}${examples.c[siteGrade]}`
        if (!examples.s[exs]) {

            if (examples.c[siteGrade] < 4) {
                examples.s[exs] = csvtext
                examples.c[siteGrade]++

                appendLine(examplesPath, `site ${siteGrade},${csvtext}\n`)
                addToDump = true
            }

        }
    }


    if (!examples.ce[enhancedGrade])
        examples.ce[enhancedGrade] = 0

    if (Math.random() < 0.01) {
        let exe = `${enhancedGrade}${examples.ce[enhancedGrade]}`
        if (!examples.e[exe]) {
            if (examples.ce[enhancedGrade] < 4) {
                examples.e[exe] = csvtext
                examples.ce[enhancedGrade]++

                appendLine(examplesPath, `enhanced ${enhancedGrade},${csvtext}\n`)
                addToDump = true
            }
        }
    }

    if (Math.random() < 0.01) {
        let span = `${siteGrade}_${enhancedGrade}`

        if (!examples.spanc[span])
            examples.spanc[span] = 0

        let exspan = `${span}${examples.spanc[span]}`

        if (!examples.span[exspan]) {

            if (examples.spanc[span] < 4) {
                examples.span[exspan] = csvtext
                examples.spanc[span]++

                appendLine(examplesPath, `span ${siteGrade} to ${enhancedGrade},${csvtext}\n`)
                addToDump = true
            }
        }
    }

    if (addToDump) {
        let trackersForDump = []

        Object.keys(site.trackersBlocked).forEach((parentCompany) => {
            Object.keys(site.trackersBlocked[parentCompany]).forEach((tracker) => {
                trackersForDump.push({
                    blocked: true,
                    prevalence: prev[parentCompany],
                    parentCompany: parentCompany
                })
            })
        })

        Object.keys(site.trackersNotBlocked).forEach((parentCompany) => {
            Object.keys(site.trackersNotBlocked[parentCompany]).forEach((tracker) => {
                trackersForDump.push({
                    blocked: false,
                    prevalence: prev[parentCompany],
                    parentCompany: parentCompany
                })
            })
        })

        testDump.push({
            url: site.url,
            input: {
                trackers: trackersForDump,
                parentCompany: site.parentCompany || null,
                parentTrackerPrevalence: prev[site.parentCompany],
                privacyScore: privacyForDump,
                https: site.hasHTTPS,
                httpsAutoUpgrade: au,
            },
            expected: {
                site: {
                    score: score.s,
                    grade: siteGrade,
                    httpsScore: https_s + https_e,
                    privacyScore: privacy,
                    trackerScore: tscore.n + tscore.b
                },
                enhanced: {
                    score: score.e,
                    grade: enhancedGrade,
                    httpsScore: https_e,
                    privacyScore: privacy,
                    trackerScore: tscore.n
                }
            }
        })
    }
};

// nullify results from previous runs
try {
    fs.unlinkSync(csvPath);
} catch(e) {
    // ah well
}
try {
    fs.unlinkSync(examplesPath);
} catch(e) {
    // ah well
}

// add the headings for the CSV
appendLine(csvPath, `${csvHeaders}\n`)
appendLine(examplesPath, `type,${csvHeaders}\n`)


if (fileList) {
    let siteList = fs.readFileSync(fileList, { encoding: 'utf8' }) 
        .trim()
        .split('\n')

    siteList.forEach( (n) => {

        calculateGrade(`${n}.json`)
        // console.log(`${inputPath} ---- ${n}.json`)

    })
}
else {
    let files = fs.readdirSync(inputPath);
    files.forEach(calculateGrade);
}


// write histogram
let hist_text = 'site score,total\n'

hist.forEach( (x, i) => {
    hist_text += `${i},${x}\n`
})

fs.writeFileSync(histPath, hist_text, 'utf8');

let hist_e_text = 'enhanced score,total\n'
hist_e.forEach( (x, i) => {
    hist_e_text += `${i},${x}\n`
})

fs.writeFileSync(hist_ePath, hist_e_text, 'utf8');

console.log(JSON.stringify(hist_grades))

let hist_grades_text = 'grade,site grade,enhanced grade,old site,old enhanced\n'
// Object.keys(hist_grades).forEach( (x, i) => {
let gseen = { }
for (let gradeOrder = 0; gradeOrder < 31; gradeOrder++) {

    let g = gradeMap[gradeOrder];

    if (!gseen[g])
        hist_grades_text += `${g},${hist_grades[g]},${hist_grades_e[g]},${old_grades[g]},${old_grades_e[g]}\n`
    
    gseen[g] = true
}

fs.writeFileSync(hist_gradesPath, hist_grades_text, 'utf8');

fs.writeFileSync('testDump.json', JSON.stringify(testDump), 'utf8')


