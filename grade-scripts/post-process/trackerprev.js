const fs = require('fs');
const name = process.argv.splice(2)
const inputPath = `${process.cwd()}/${name}-grades/`;

// parent company -> site
let parents = { }

let parentCount = { }


// parentdomain => [ tracker url, tracker url ]
// 'Yahoo!techcrunch.com': [ 'geo.yahoo.com' ]
let parent_domain = { }

const files = fs.readdirSync(inputPath);

files.forEach( (fileName) => {
    let siteName = fileName.replace(/\.json$/, '');
    let jsonText = fs.readFileSync(inputPath + fileName, 'utf8');
    let site = JSON.parse(jsonText);

    Object.keys(site.trackersBlocked).forEach( (k) => {
        // console.log(`    ${k}`)

        if (!parents[k])
            parents[k] = [ ]

        if (!parentCount[k])
            parentCount[k] = 0

        parentCount[k]++

        if (parents[k].indexOf(siteName) == -1) {
            parents[k].push(siteName)
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
});

let csvText = 'network,count,percent\n'
let parentPercent = { }

let pround = (n, precision) => {
    let f = Math.pow(10, precision)
    return Math.round(n * f) / f
}

Object.keys(parentCount).forEach( (k) => {

    parentPercent[k] = pround(parentCount[k] / files.length * 100, 2)
    csvText += `${k},${parentCount[k]},${parentPercent[k]}\n`
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


