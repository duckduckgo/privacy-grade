const fs = require('fs');
const log = console.log;
const chalk = require('chalk');
const name = process.argv[2];
//    csvHeaders = 'domain,requests,initial,is major,tosdr,in major,https,obscure,blocked,total,grade\n'
const csvHeaders = 'domain,requests,site pscore,blocked score,unblocked score,https,tosdr,polisis,calculated privacy,site,enhanced,oldscore,grade'
const csvPath  = `${name}.csv`;
const histPath = `${name}.hist.csv`;
const hist_ePath = `${name}.hist-e.csv`;
const inputPath = `${process.cwd()}/${name}-grades/`;

const prev = require('./prev')

let hist = new Array(100)
let hist_e = new Array(100)

const appendLine = (fn,text) => {
    try {
        fs.appendFileSync(fn, text)
    }
    catch (err) {
        console.log(chalk.red(`error writing to ${fn}`))
    }
}


var trackerScore = (site) => {

    console.log(`---\n${site.domain} => ${Object.keys(site.trackersBlocked).length} parent: ${site.parentCompany}`)

    let parent = 0

    if (site.parentCompany)
        parent = prev[site.parentCompany] || 0


    let normalizeTracker = (p) => {

        if (!p)
            return 0

        // most common
        if (p<1)
            return 1

        // google
        if (p > 80)
            return 5

        // facebook
        if (p > 30)
            return 4

        if (p > 3)
            return 3

        // everything else
        return p
            
    }

    let bl = (l) => {
        if (!l)
            return 0

        let s = 0
        Object.keys(l).forEach( co => {

            let p = prev[co] || 0
            let np = normalizeTracker(p)

            console.log(`   ${co}: ${p} -> ${np}`)

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

function _getDetailsData (jsonText) {
    let siteData = JSON.parse(jsonText);

    let detailsData = siteData.map((site) => ({
        url: site.url,
        details: site.decisions
    }));

    return JSON.stringify(detailsData, null, "  ");
}


let csvDetails = (details) => {
    let cols = ''
    const col = (s) => { return `${s},` }

    // assuming that the data is in column header order
    // that is the order it is in the algorithm
    // if that changes, we need to change this, will have to order by d.why
    details.forEach( (d) => {

        // for the final one we'll add the final grade as another column
        if (d.why.match(/final grade/)) {
            cols += col(d.index)
            cols += d.grade
        }
        else {
            cols += col(d.change)
        }
    })
    return cols;
};

let csvSimple = (simpleArray) => {
    let cols = ''
    simpleArray.forEach( (el) => {
        cols += `${el},`
    })

    if (cols.length > 1)
        return cols.substring(0, cols.length - 1);

    return ''
};

let getCSVData = (fileName) => {
    if (fileName.match(/^\./))
        return
    let siteName = fileName.replace(/\.json$/, '');
    let jsonText = fs.readFileSync(inputPath + fileName, 'utf8');

    let site = JSON.parse(jsonText);

    site.domain = siteName

    if (!site.url || !site.decisions) {
        console.log(chalk.red(`error: missing site url or details for ${fileName}`));
        return;
    }

    // let csvtext = `${siteName},${site.totalBlocked},${csvDetails(site.decisions)}`
    const whole = 5
    const half = 3
    const none = 0

    // let score_blocked = 0
    // let score_unblocked = 0
    let tscore = trackerScore(site)
    let score = {s:0, e: 0}
    let grade = 'X'
    let polisis = site.polisis || { good:0, bad:0}
    let https = site.hasHTTPS  ? none : whole
    let privacy = 0 //site.tosdr ? site.tosdr.badScore : 0
    let tosdr = 0
    let oldscore = site.beforeIndex || -1 
    

    if (site.tosdr && site.tosdr.badScore)
        tosdr = site.tosdr.badScore * 0.25

    privacy = tosdr + polisis.bad

    // unknown privacy practices
    if (privacy === 0 && polisis.good === 0 && polisis.bad === 0)
        privacy = half


    // enhanced score excludes blocked trackers
    // this does not yet account for whether we upgraded https
    //        blocked     site prev    https   polisis       scaled tosdr
    score.e = tscore.n + tscore.site + https + privacy // polisis.bad + tosdr 

    // site score includes blocked tracekrs
    score.s = score.e + tscore.b

    score.s_rounded = Math.round(score.s / 5, 1) * 5
    // score.e_rounded = Math.round(score.e / 2, 1) * 2
    score.e_rounded = score.e

    if (!hist[score.s_rounded])
        hist[score.s_rounded] = 0
    hist[score.s_rounded] += 1;

    if (!hist_e[score.e_rounded])
        hist_e[score.e_rounded] = 0
    hist_e[score.e_rounded] += 1;


    //               domain,      requests,         site pscore,  blocked score,   unblocked score, https, tosdr, polisis, privacy ,      site,   enhanced,   oldscore, grade\n'
    let csvtext = `${siteName},${site.totalBlocked},${tscore.site},${tscore.b},${tscore.n},${https},${tosdr},${polisis.bad},${privacy},${score.s},${score.e},${oldscore},${grade}`
    // console.log(csvtext)

    appendLine(csvPath, `${csvtext}\n`)
};

// nullify results from previous runs
try {
    fs.unlinkSync(csvPath);
} catch(e) {
    // ah well
}

// add the headings for the CSV
appendLine(csvPath, `${csvHeaders}\n`)

const files = fs.readdirSync(inputPath);

files.forEach(getCSVData);

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





