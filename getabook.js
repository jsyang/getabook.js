// Inspired by code from https://njw.name/getxbook/

const fs                             = require('fs');
const https                          = require('https');
const {execSync}                     = require('child_process');
const [_nodePath, _scriptPath, asin] = process.argv;

const isVerbose = process.argv.includes('-v');

const log = isVerbose ? console.log : new Function();

const OPTIONS = {
    hostname: 'www.amazon.com',
    headers:  {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36"},
    key:      '',
    cert:     '',
    agent:    false
};

let bookTitle = asin;

const getTitleFromHTML = html => html.match(/<title[^>]*[>][^<]+/g)[0].split('>').pop();

function getAmazonHTTPSReturnPromise(path, isGetTitleRequest = false) {
    let responseBody = '';

    return new Promise(
        (resolve, reject) => https.get(
            {...OPTIONS, path},
            res => {
                res.on('error', console.error);
                res.on('data', chunk => responseBody += chunk);
                res.on('end', () => {
                    if (isGetTitleRequest) {
                        resolve(getTitleFromHTML(responseBody));
                    } else if (res.headers['content-type'].includes('application/json')) {
                        resolve(JSON.parse(responseBody));
                    } else {
                        reject(`FAILED: GET ${OPTIONS.hostname + path}`);
                    }
                });
            }
        )
    );
}

function getHTTPSReturnPromise(lookInsidePageNumber, url, i, a) {
    const data     = [];
    const filename = url.split('.jpg')[0].split('/').pop() + '.jpg';
    const filePath = `${bookTitle}/${filename}`;
    if (!fs.existsSync(filePath)) {
        return new Promise(resolve => {
            log(`Retrieving CDN image "${url}"...`);

            https.get(url, res => {
                res.on('error', console.error);
                res.on('data', chunk => data.push(chunk));
                res.on('end', () => {
                    log(`Got ${i + 1}/${a.length} of page ${lookInsidePageNumber}`);
                    fs.writeFile(filePath, Buffer.concat(data), resolve);
                });
            });
        });
    } else {
        return Promise.resolve();
    }
}

getAmazonHTTPSReturnPromise(`/title/dp/${asin}`, true)
    .then(htmlTitle => {
        bookTitle = htmlTitle
            .split(': Amazon.')[0]
            .replace(/[\(\):]+/g, '-')
            .replace(/\s+/g, '_');

        execSync(`mkdir -p ${bookTitle}`);
    })
    .then(() => getAmazonHTTPSReturnPromise(`/gp/search-inside/service-data?method=getBookData&asin=${asin}`))
    .then(res => {
        log(`Initial response:\n${JSON.stringify(res)}`);

        return Promise.all(
            Object.values(res.litbPages)
                .map(pageNumber =>
                    getAmazonHTTPSReturnPromise(`/gp/search-inside/service-data?method=goToPage&asin=${asin}&page=${pageNumber}`)
                )
        );
    })
    .then(pages => Promise.all(
        pages.map(
            ({jumboImageUrls}) => jumboImageUrls ?
                Object.values(jumboImageUrls).map(getHTTPSReturnPromise.bind(null, pageNumber)) :
                Promise.resolve()
        ))
    )
    .catch(console.error);