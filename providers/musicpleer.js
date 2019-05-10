const { DownloadProvider } = require('../lib/provider')
const cheerio = require('cheerio')
const puppeeter = require('puppeteer')

class MusicPleerProvider extends DownloadProvider {
  constructor () {
    super({
      id: 'musicpleer',
      name: 'MusicPleer'
    })

    this.browser = puppeeter.launch({
      headless: true,
      args: [
        "--disable-gpu",
        "--disable-setuid-sandbox",
        "--force-device-scale-factor",
        "--ignore-certificate-errors",
        "--no-sandbox",
      ],
      ignoreHTTPSErrors: true,
    })
  }

  async search (query) {
    const browser = await this.browser
    const page = await browser.newPage()
    await page.setRequestInterception(true);

    page.on('request', (req) => {
      if(['image', 'font', 'stylesheet'].includes(req.resourceType())){
          req.abort();
      } else {
        req.continue();
      }
    })

    await page.goto(`https://musicpleer.media/#!${query}`)
    await page.waitFor('#searchResults ul li a')
    const results = await page.$$('#searchResults ul li')

    return Promise.all(
      results.map(async e => {
        const title = await e.$eval('a h3', e => e.textContent)
        const artist = (await e.$eval('a p', e => e.textContent)).replace('Artist: ', '')
        return {
          title: `${title} - ${artist}`,
          link : await e.$eval('a', e => e.href),
          page,
        }
      })
    )
  }

  async resolve (item) {
    await item.page.goto(item.link)
    await item.page.waitFor('#download-btn')
    const link = await item.page.$eval('#download-btn', e => e.href)
    item.page.close()
    return link
  }

  async destroy () {
    const browser = await this.browser
    await browser.close()
    return null
  }
}

module.exports = MusicPleerProvider