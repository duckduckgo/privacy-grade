const fs = require('fs');
const name = process.argv.splice(2)
const inputPath = `${process.cwd()}/${name}-grades/`;

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


// parentdomain => [ tracker url, tracker url ]
// 'Yahoo!techcrunch.com': [ 'geo.yahoo.com' ]
let parent_domain = { }

const files = fs.readdirSync(inputPath);

files.forEach( (fileName) => {
    let siteName = fileName.replace(/\.json$/, '');
    let jsonText = fs.readFileSync(inputPath + fileName, 'utf8');
    let site = false
    
    try {
        site = JSON.parse(jsonText);
    } catch (e) {
        console.log(`bail on ${fileName}`)
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

            })

        })
    }
});

let csvText = 'network,total count,blocked,not blocked,total percent\n'
let parentPercent = { }

let pround = (n, precision) => {
    let f = Math.pow(10, precision)
    return Math.round(n * f) / f
}

Object.keys(parentCount).forEach( (k) => {

    parentPercent[k] = pround(parentCount[k] / files.length * 100, 3)
    if (!blocked[k])
        blocked[k] = 0
    if (!notblocked[k])
        notblocked[k] = 0
    csvText += `${k},${parentCount[k]},${blocked[k]},${notblocked[k]},${parentPercent[k]}\n`
})

fs.writeFileSync(`${name}-networks.csv`, csvText)

fs.writeFileSync(`${name}-networks.json`, JSON.stringify(parentPercent));


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


