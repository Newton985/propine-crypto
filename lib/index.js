#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = __importDefault(require("axios"));
var chalk = require('chalk');
var clear = require('clear');
var figlet = require('figlet');
var program = require('commander');
var fs = require('fs');
var csv = require('csv-parser');
clear();
console.log(chalk.red(figlet.textSync('propine', { horizontalLayout: 'full' })));
var filePath;
program
    .version('0.0.1')
    .description('Propine portfolio viewer')
    .option('-t, --token <string>', 'The Token [btc|eth|xrp]')
    .option('-d, --date <string>', 'The Date [yyyy/mm/dd]')
    .arguments('<file>').action(function (file) {
    filePath = file;
})
    .parse(process.argv);
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
var options = program.opts();
var token = options.token;
var date = options.date;
var compareTimeStamp = +new Date(); //now timestamp in millis 
//check if token is supplied, if so, check if valid
if (token) {
    token = token.toLowerCase();
    if (token != "btc" && token != "eth" && token != "xrp") {
        console.log("UnKnown Token :", token);
        console.log("Available tokes are 'BTC', 'ETH', 'XRP'");
        process.exit(1);
    }
}
//check if date is supplied, update compareTimeStamp to supplied date
if (date) {
    compareTimeStamp = +new Date(date);
}
var url = "https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,XRP&tsyms=USD&api_key=d248e277ca5e2cb671c1ddddac1f56b4275467e9845016a013f26a10bc6af2c3";
if (!filePath) {
    console.log("FILE PATH IS MISSING");
    process.exit(1);
}
else {
    ////show a loading animation,
    var fetchComplete_1 = false;
    var twirlTimer = (function () {
        var S = ["\\", "|", "/", "--"];
        var x = 0;
        if (!fetchComplete_1) {
            return setInterval(function () {
                process.stdout.write("\r" + S[x++]);
                x &= 3;
            }, 250);
        }
    })();
    ////////end animation
    var btcPortfolio_1 = 0;
    var ethPortfolio_1 = 0;
    var xrpPortfolio_1 = 0;
    fs.createReadStream(filePath, {
        'bufferSize': 100000 * 1024 // read up to 100MB of data at a time
    })
        .pipe(csv())
        .on('data', function (lineData) {
        var transactionTimestamp = Number.parseFloat(lineData.timestamp) * 1000;
        //get all that are older than timestamp
        if (transactionTimestamp <= compareTimeStamp) {
            if (lineData.token == 'BTC') {
                if (lineData.transaction_type == 'DEPOSIT') {
                    btcPortfolio_1 += Number.parseFloat(lineData.amount);
                }
                else {
                    btcPortfolio_1 -= Number.parseFloat(lineData.amount);
                }
            }
            else if (lineData.token == 'ETH') {
                if (lineData.transaction_type == 'DEPOSIT') {
                    ethPortfolio_1 += Number.parseFloat(lineData.amount);
                }
                else {
                    ethPortfolio_1 -= Number.parseFloat(lineData.amount);
                }
            }
            else {
                // console.log("LINE D XRP ::", lineData)
                if (lineData.transaction_type == 'DEPOSIT') {
                    xrpPortfolio_1 += Number.parseFloat(lineData.amount);
                }
                else {
                    xrpPortfolio_1 -= Number.parseFloat(lineData.amount);
                }
            }
        }
    })
        .on('end', function () {
        console.log("Convert to USD");
        axios_1.default.get(url).then(function (response) {
            var resp = response.data;
            var btcUsd = btcPortfolio_1 * resp.BTC.USD;
            var ethUsd = ethPortfolio_1 * resp.ETH.USD;
            var xrpUsd = xrpPortfolio_1 * resp.XRP.USD;
            var portFolios = [{
                    TOKEN: "ETH",
                    PORTFOLIO: ethPortfolio_1,
                    USD: ethUsd
                },
                {
                    TOKEN: "BTC",
                    PORTFOLIO: btcPortfolio_1,
                    USD: btcUsd
                },
                {
                    TOKEN: "XRP",
                    PORTFOLIO: xrpPortfolio_1,
                    USD: xrpUsd
                }
            ];
            if (token) {
                if (token == 'btc') {
                    portFolios.pop();
                    portFolios.shift();
                }
                else if (token == 'eth') {
                    portFolios.pop();
                    portFolios.pop();
                }
                else if (token == 'xrp') {
                    portFolios.shift();
                    portFolios.shift();
                }
            }
            console.log("RESULTS");
            console.table(portFolios);
            fetchComplete_1 = true;
            process.exit(0);
        }).catch(function (err) {
            console.log(err);
        });
    });
}
