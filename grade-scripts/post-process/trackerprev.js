const fs = require('fs');
const program = require('commander')

program
    .option('-i, --input <name>', 'The name to use when looking for sites, e.g. "test" will look in "test-sites"')
    .option('-o, --output <name>', 'Output name, e.g. "test" will output files at "test-grades"')
    .option('-f, --file <name>', 'Allow processing a subset of dumped site data, defined in a file')
    .parse(process.argv)

const name = program.input
const output = program.output
const inputPath = `${process.cwd()}/${name}-grades/`;
const fileList = program.file

const networksPathCsv = `${output}-networks-grouped.csv`

// const name = process.argv.splice(2)
// const inputPath = `${process.cwd()}/${name}-grades/`;

const entityMap = require('../../data/generated/entity-map')

let reverseEntity = { }

Object.keys(entityMap).forEach( (domain) => {
    reverseEntity[entityMap[domain]] = domain
})

// parent company -> site
let parents = { }

let parentCount = { }

let blocked = { }
let notblocked = { }

//   {
//      google: {
//          '0': count, // count of presence on page in first 0-1k 
//          '1': count
//      }
//   }
//
//   tracker,0,1,2,3,..
//   google,
//
//
let trackersByCompany = { }

// parentdomain => [ tracker url, tracker url ]
// 'Yahoo!techcrunch.com': [ 'geo.yahoo.com' ]
let parent_domain = { }



// "Google": {
//     "google-analytics.com": {
//         "parentCompany": "Google",
//         "url": "google-analytics.com",
//         "type": "surrogatesList",
//         "block": true,
//         "reason": "surrogate",
//         "redirectUrl": "data:application
//     } //,
// }
let hasSurrogate = (p) => {
    if (p.reason && p.reason == 'surrogate')
        return true

    return false
}
let hasWhitelist = (p) => {
    if (p.reason && p.reason == 'whitelisted')
        return true

    return false
}



//----



// group is groups of groupOrder
let group = 0
let groupOrder = 1000



//----


let processFile = (fileName, siteName, filegroup) => {
// files.forEach( (fileName) => {
    // let siteName = fileName.replace(/\.json$/, '');

    // console.log(`processFile: filename ${fileName}, site: ${siteName}`)

    let jsonText = ''
    let site = false


    try {
        jsonText = fs.readFileSync(inputPath + fileName, 'utf8');
        site = JSON.parse(jsonText);
    } catch (e) {
        // console.log(`error reading ${fileName}, skipping`)
        return
    }

    if (!site)
        return

    // console.log(`${siteName}:`)


    let addParent = (p, child, blockgroup) => {
        if (!parents[p])
            parents[p] = [ ]


        if (!parentCount[p])
            parentCount[p] = 0

        // add to blocked or not blocked group
        if (!blockgroup[p])
            blockgroup[p] = 0

        parentCount[p]++
        blockgroup[p]++

        if (parents[p].indexOf(child) == -1) {
            parents[p].push(child)
        }

        if (!trackersByCompany[p])
            trackersByCompany[p] = { }


        if (!trackersByCompany[p][filegroup])
            trackersByCompany[p][filegroup] = 0

        trackersByCompany[p][filegroup]++

    }

    // only add one parent entity per site
    // sometimes there are several parent-owned trackers per site
    // for both blocked and not blocked
    let localParents = { }

    // "trackersBlocked": {
    //     "InsightExpress": {
    //         "insightexpressai.com": {
    //             "parentCompany": "InsightExpress",
    //             "url": "insightexpressai.com",
    //             "type": "Advertising",
    //             "block": true,
    //             "reason": "trackersWithParentCompany"

    // console.log('  blocked:')
    Object.keys(site.trackersBlocked).forEach( (k) => {


        Object.keys(site.trackersBlocked[k]).forEach( (url) => {

            let parentEntity = entityMap[url] || k

            // console.log(`    ${k} (${url}) entityMap: '${parentEntity}'`)

            // only add one parent entity per site
            // sometimes there are several parent-owned trackers per site
            if (!localParents[parentEntity])
                addParent(parentEntity, siteName, blocked)

            localParents[parentEntity] = true


            // this could be generalized
            if (hasSurrogate(site.trackersBlocked[k][url])) {
                let sparent = `${parentEntity}-surrogate`
                if (!localParents[sparent])
                    addParent(sparent, siteName, blocked)
                localParents[sparent] = true
            }


            

        /*
        let pd = `${k}${siteName}`;

        if (!parent_domain[pd])
            parent_domain[pd] = []

        // for each tracker by parent
        Object.keys(site.trackersBlocked[k]).forEach( (pt) => {
            if (parent_domain[pd].indexOf(pt) == -1) {
                parent_domain[pd].push(pt)
                console.log(`        ${pt}`)
            }
        })
        */
        })

    })
    if (site.trackersNotBlocked) {
        // console.log('  not blocked:')
        Object.keys(site.trackersNotBlocked).forEach( (k) => {

            Object.keys(site.trackersNotBlocked[k]).forEach( (url) => {

                let parentEntity = entityMap[url] || k

                // console.log(`    ${k} (${url}) entityMap: '${parentEntity}'`)

                if (!localParents[parentEntity])
                    addParent(parentEntity, siteName, notblocked)

                localParents[parentEntity] = true

                if (hasWhitelist(site.trackersNotBlocked[k][url])) {
                    let sparent = `${parentEntity}-whitelisted`
                    if (!localParents[sparent])
                        addParent(sparent, siteName, notblocked)
                    localParents[sparent] = true
                }
            })

        })
    }
}

// assume current filecount = rank = file order. Use -f to specify
let filecount = 0

// build file list

if (fileList) {
    let siteList = fs.readFileSync(fileList, { encoding: 'utf8' }) 
        .trim()
        .split('\n')

    siteList.forEach( (n) => {

        processFile(`${n}.json`, n, group)

        filecount += 1

        if (filecount % groupOrder == 0) {
            group += 1
            console.log(`group ${group}`)
        }


        // console.log(`${inputPath} ---- ${n}.json`)

    })
}
else {
    let files = fs.readdirSync(inputPath);

    files.forEach( (fileName) => {
        let siteName = fileName.replace(/\.json$/, '');
        processFile(fileName, siteName, filecount)

        filecount += 1
        if (filecount % groupOrder == 0)
            group += 1
    })
}

// Calculate percentages and build output


let csvText = 'network,total count,blocked,not blocked,total percent\n'
let parentPercent = { }

let pround = (n, precision) => {
    let f = Math.pow(10, precision)
    return Math.round(n * f) / f
}

Object.keys(parentCount).forEach( (k) => {

    parentPercent[k] = pround(parentCount[k] / filecount * 100, 3)
    if (!blocked[k])
        blocked[k] = 0
    if (!notblocked[k])
        notblocked[k] = 0
    csvText += `${k},${parentCount[k]},${blocked[k]},${notblocked[k]},${parentPercent[k]}\n`
})

fs.writeFileSync(`${output}-networks.csv`, csvText)

fs.writeFileSync(`${output}-networks.json`, JSON.stringify(parentPercent));

fs.writeFileSync(`${output}-networks-grouped.json`, JSON.stringify(trackersByCompany));


let writeGroups = (maxgroups) => {
    // nullify results from previous runs
    try {
        fs.unlinkSync(networksPathCsv);
    } catch(e) {
        // ah well
    }

    // write first line
    let firstline = 'tracker'
    for (g=0; g< maxgroups; g++) {
        firstline += `,${g}`
    }
    fs.appendFileSync(networksPathCsv, `${firstline}\n`)

    Object.keys(trackersByCompany).forEach(  (t) => {

        let g = 0;
        let gs= `${t}`
        let trackergroups = trackersByCompany[t]

        let total = 0

        for (g=0; g< maxgroups; g++) {
            let c = trackergroups[`${g}`] || 0
            total += c

            gs += `,${c}`

        }
        // console.log(gs)

        // only write ones that are on about half the groups (in total)
        if (total > 25) // could also be > 1 or 2 to omit trackers only on one site
            fs.appendFileSync(networksPathCsv, `${gs}\n`)

    })


}

writeGroups(group)

// console.log(JSON.stringify(parents))

/*

fs.writeFileSync(`${name}-reverse.json`, JSON.stringify(parents));

console.log('\nReverse:')

Object.keys(parents).forEach( (k) => {
    console.log(k)

    parents[k].forEach( (u) => {
        let pd = `${k}${u}`;
        console.log(`    ${u}`)

        if (parent_domain[pd]) {
            parent_domain[pd].forEach( (pdu) => {
                console.log(`        ${pdu}`)
            })
        }
    })
})

*/


