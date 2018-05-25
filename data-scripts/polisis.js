const fs = require('fs')

const fileName = process.argv[2];


let jsonText = fs.readFileSync(fileName, 'utf8');

let s = JSON.parse(jsonText);
 
const entityMap = require('../data/generated/entity-map')

let pmap = { }

let pointMap = {
    "Certain data is shared with third parties for advertising purposes.": 4,
    "Some personal information is shared with third parties.": 6,
    "Data might be shared in the case of a merger or acquisition.": 1,
    "Some data might be retained indefinitely.": 1
}

let pointSummarize = {
    "Certain data is shared with third parties for advertising purposes.": "3rd parties ad sharing",
    "Some personal information is shared with third parties.": "3rd party personal data",
    "Data might be shared in the case of a merger or acquisition.": "data shared in merger",
    "Some data might be retained indefinitely.": "data stored indefinitely" 
}
    // "3rd parties ad sharing",
    // "3rd party personal data",
    // "data shared in merger",
    // "data stored indefinitely" 

let columnOrder = [
    "Certain data is shared with third parties for advertising purposes.",
    "Some personal information is shared with third parties.",
    "Data might be shared in the case of a merger or acquisition.",
    "Some data might be retained indefinitely."
]

let domainMap = { }

let columns = 'domain,'

columnOrder.forEach( (c) => {
    columns += `${pointSummarize[c]},`
})
columns += 'total'

console.log(columns)


// 1 targeted third-party advertising
// 2 they can license to third parties
// 3 logs are kept forever
// 5 may sell your data in merger
// 6 your data is used for many purposes
// 7 tracks you on other websites
// 7 they can use your content for all their existing and future services
// 10 personal data is given to third parties

// console.log("site,polisis sum")

Object.keys(s).forEach(  (k) => {

    // console.log(k)

    let v = s[k]
    let siteSum = 0


    let pointbuffer = { }

    if (v && v.bad) {

        Object.keys(v.bad).forEach( (point) => {



            if (pointMap[point]) {
                // pointbuffer.push(point)
                // console.log(`    ${point}`)
                siteSum += pointMap[point]
                pointbuffer[point] = pointMap[point]
            }
            // else
            //     console.log(`not found: ${point}`)

            // if (! pmap[point]) {
            //     pmap[point] = 0
            //     console.log(point)
            // }
        })


    }

    // console.log(`${k}: ${siteSum}`)

    let domainline = `${k}`

    columnOrder.forEach( (point) => {
        if (pointbuffer[point])
            domainline += `,${pointMap[point]}`
        else
            domainline += ',0'

    })
    
    domainline += `,${siteSum}`

    console.log(domainline)


    domainMap[k] = siteSum


    // pointbuffer.forEach( (p) => {
    //     console.log(`    ${p}`)
    // })

})


Object.keys(domainMap).forEach( d => {

    let p = domainMap[d]

    let parent = entityMap[d]
                          
    if (parent) {
        // console.log(`${d} -> ${parent} : ${p}`)

        if (!domainMap[parent]) {
            domainMap[parent] = p
        }

    }

})

fs.writeFileSync(`polisismap.json`, JSON.stringify(domainMap))

