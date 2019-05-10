const axios = require('axios')

class DownloadProvider {
  constructor ({ name }) {
    this.name = name
    this.http = axios.create({
      timeout: 30000
    })
  }

  search (query) {
    throw new Error('search() not implemented.')
  }

  resolve (item) {
    return item
  }

  download (url) {
    this.http.defaults.responseType = 'stream'
    return this.http.get(url)
  }

  destroy () {
    return null
  }
}

module.exports.DownloadProvider = DownloadProvider