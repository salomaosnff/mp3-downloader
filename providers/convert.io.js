const { DownloadProvider } = require('../lib/provider')
const youtubeSearch = require('youtube-crawler')
const cheerio = require('cheerio')

class ConvertIoProvider extends DownloadProvider {
  constructor () {
    super({
      id: 'convert.io',
      name: 'Youtube (Convert.io)'
    })

    this.http.defaults.baseURL = 'https://www.convertmp3.io'
  }

  search (query) {
    return new Promise((resolve) => {
      youtubeSearch(query, (err, result) => resolve(result))
    })
  }

  async resolve (item) {
    this.http.defaults.responseType = 'json'
    const res = await this.http({
      url: '/download',
      params: {
        video: item.link
      }
    })

    const $ = cheerio.load(res.data)
    const url = $('#download').attr('href')

    return url
  }
}

module.exports = ConvertIoProvider