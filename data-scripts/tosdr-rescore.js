const fs = require('fs')
const chalk = require('chalk')

const fileName = 'data/generated/tosdr.json' //process.argv[2];

const outputFileName = 'data/generated/tosdr-scores.json'

let jsonText = fs.readFileSync(fileName, 'utf8');

let s = JSON.parse(jsonText);

const entityMap = require('../data/generated/entity-map')

let assignScore = (site) => {

    if (site.class && site.class === 'A')
        return 0

    if (site.class && site.class === 'B')
        return 1

    // if (site.class && site.class === 'D') {
    //     // console.log(`${site.domain} class D`)
    //     return 10
    // }


    let score = site.score

    if (!score)
        return false

    if (score > 150)
        return 10

    if (score > 100)
        return 7

    return 5
}

let generated = { }


// uncomment for CSV comparison
// console.log('domain,score,class,privacy grade score')

Object.keys(s).forEach(  (domain) => {


    let site = s[domain]
    site.domain = domain

    let score = assignScore(site)

    // if (score === false) {
    //     console.log(chalk.red(`${domain}: ${site.score} (${site.class}) ==> ${score}`))
    // }
    // else
    // if (score === 0 || score === 1) {

    //     console.log(chalk.green(`${domain}: ${site.score} (${site.class}) ==> ${score}`))
    // }
    // else
    //     console.log(`${domain}: ${site.score} (${site.class}) ==> ${score}`)


    if (score !== false) {
        generated[domain] = [ score ]


        let parent = entityMap[domain]
        if (parent && !generated[parent]) {
            generated[parent] = [ score ]
        }
    }




    // uncomment for CSV comparison
    // console.log(`${domain},${site.score},${site.class},${score}`)
})

console.log(JSON.stringify(generated))

fs.writeFileSync(outputFileName, JSON.stringify(generated))


