#!/usr/bin/env node

import axios from "axios";

const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const program = require('commander');
const fs = require('fs')
const csv = require('csv-parser')


clear()
console.log(
  chalk.red(
    figlet.textSync('propine', { horizontalLayout: 'full' })
  )
);

let filePath;

program
  .version('0.0.1')
  .description('Propine portfolio viewer')
  .option('-t, --token <string>', 'The Token [btc|eth|xrp]')
  .option('-d, --date <string>', 'The Date [yyyy/mm/dd]')
  .arguments('<file>').action((file: any) => {
    filePath = file
  }

  )
  .parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

const options = program.opts();

let token: string = options.token
let date: string = options.date
let compareTimeStamp: number = +new Date() //now timestamp in millis 

//check if token is supplied, if so, check if valid
if (token) {
  token = token.toLowerCase()
  if (token != "btc" && token != "eth" && token != "xrp") {
    console.log("UnKnown Token :", token)
    console.log("Available tokes are 'BTC', 'ETH', 'XRP'")

    process.exit(1)
  }

}


//check if date is supplied, update compareTimeStamp to supplied date
if (date) {
  compareTimeStamp = +new Date(date)
}

const url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,XRP&tsyms=USD&api_key=d248e277ca5e2cb671c1ddddac1f56b4275467e9845016a013f26a10bc6af2c3`

if (!filePath) {

  console.log("FILE PATH IS MISSING")

  process.exit(1)

} else {



  ////show a loading animation,
  let fetchComplete = false
  var twirlTimer = (function () {
    var S = ["\\", "|", "/", "--"];
    var x = 0;
    if (!fetchComplete) {
      return setInterval(function () {
        process.stdout.write("\r" + S[x++]);
        x &= 3;
      }, 250);
    }
  })();
  ////////end animation


  let btcPortfolio = 0;
  let ethPortfolio = 0;
  let xrpPortfolio = 0;

  fs.createReadStream(filePath, {
    'bufferSize': 100000 * 1024     // read up to 100MB of data at a time
  })
    .pipe(csv())
    .on('data', (lineData: any) => {

      const transactionTimestamp = Number.parseFloat(lineData.timestamp) * 1000

      //get all that are older than timestamp
      if (transactionTimestamp <= compareTimeStamp) {


        if (lineData.token == 'BTC') {

          if (lineData.transaction_type == 'DEPOSIT') { btcPortfolio += Number.parseFloat(lineData.amount) }
          else { btcPortfolio -= Number.parseFloat(lineData.amount) }

        } else if (lineData.token == 'ETH') {

          if (lineData.transaction_type == 'DEPOSIT') { ethPortfolio += Number.parseFloat(lineData.amount) }
          else { ethPortfolio -= Number.parseFloat(lineData.amount) }

        } else {
          // console.log("LINE D XRP ::", lineData)
          if (lineData.transaction_type == 'DEPOSIT') { xrpPortfolio += Number.parseFloat(lineData.amount) }
          else { xrpPortfolio -= Number.parseFloat(lineData.amount) }

        }
      }

    })
    .on('end', () => {

      console.log("Convert to USD")

      axios.get(url).then(response => {

        const resp = response.data;

        const btcUsd = btcPortfolio * resp.BTC.USD;
        const ethUsd = ethPortfolio * resp.ETH.USD;
        const xrpUsd = xrpPortfolio * resp.XRP.USD;

        const portFolios = [{
          TOKEN: "ETH",
          PORTFOLIO: ethPortfolio,
          USD: ethUsd

        },
        {
          TOKEN: "BTC",
          PORTFOLIO: btcPortfolio,
          USD: btcUsd

        },
        {
          TOKEN: "XRP",
          PORTFOLIO: xrpPortfolio,
          USD: xrpUsd

        }
        ]

        if (token) {

          if (token == 'btc') { portFolios.pop(); portFolios.shift() }

          else if (token == 'eth') { portFolios.pop(); portFolios.pop() }

          else if (token == 'xrp') { portFolios.shift(); portFolios.shift() }

        }

        console.log("RESULTS")
        console.table(portFolios)
        fetchComplete = true

        process.exit(0)

      }).catch(err => {
        console.log(err)
      })


    })

}

