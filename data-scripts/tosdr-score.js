const fs = require('fs')
const chalk = require('chalk')

const fileName = process.argv[2];


let jsonText = fs.readFileSync(fileName, 'utf8');

let s = JSON.parse(jsonText);


let assignScore = (site) => {

    if (site.class && site.class === 'A')
        return 0

    if (site.class && site.class === 'B')
        return 1


    let score = site.score

    if (!score)
        return false

    if (score > 150)
        return 10

    if (score >= 100)
        return 7

    return 5
}

let generated = { }


// uncomment for CSV comparison
// console.log('domain,score,class,privacy grade score')

Object.keys(s).forEach(  (domain) => {


    let site = s[domain]

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


    if (score !== false)
        generated[domain] = [ score ]

    // uncomment for CSV comparison
    // console.log(`${domain},${site.score},${site.class},${score}`)
})

console.log(JSON.stringify(generated))

