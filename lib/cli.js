const { readdirSync, createWriteStream } = require("fs");
const Inquirer = require('inquirer')
const Listr = require('listr')
const path = require('path')
const mkdirp = require('mkdirp')
const ProgressBar = require('./progress')
const PROVIDERS_DIR = path.resolve(__dirname, '../providers')

function combine (array) {
  const bigger = Math.max(...array.map(item => item.length))
  const result = []
  
  for (let i = 0; i < bigger; i++) {
    array.forEach(item => {
      const value = item[i]
      if (value !== undefined) result.push(value)
    })
  }
  
  return result
}
class CliApplication {
  constructor() {
    this.dir = path.join(process.cwd(), 'Downloads')
    this.providers = readdirSync(PROVIDERS_DIR)
      .map(file => {
        const ProviderItem = require(PROVIDERS_DIR + '/' + file)
        return new ProviderItem()
      })

    mkdirp(this.dir, () => {})
  }

  async search(search, select = undefined) {
    if (!search) {
      search = (await Inquirer.prompt({
        name: 'query',
        message: 'Enter a song name:'
      })).query
    }

    const taskList = this.providers.map(provider => ({
      title: provider.name,
      task: async (ctx, task) => {
        const items = (await provider.search(search)).map(r => {
          r.provider = provider
          r.name = `${r.title} [${provider.name}]`
          r.value = r
          return r
        })

        ctx.items.push(items)

        task.title += `\t${items.length} results`
      }
    }))

    const tasks = new Listr(taskList, { concurrent: true })
    const { items } = await tasks.run({ items: [] })
    const results = combine(items)

    if (select) {
      return results.filter((r, index) => select.includes(index))
    }

    return (await Inquirer.prompt({
      type: 'checkbox',
      name: 'download',
      validate: value => value.length > 0,
      choices: results
    })).download
  }

  async download(choices) {
    await new Listr(
      choices.map(item => ({
        title: `${item.title} [${item.provider.name}]`,
        task: () => this.downloadItem(item)
      })), {
      concurrent: process.argv.includes('--parallel'),
      exitOnError: false
    }).run()
    await Promise.all(this.providers.map(async p => p.destroy()))
  }

  async downloadItem(item) {
    return new Listr([
      {
        title: `Downloading...`,
        task: async (ctx, task) => {
          let url = item.link

          if (typeof item.provider.resolve === 'function') {
            task.title = 'Resolving...'
            url = await item.provider.resolve(item)
          }

          task.title = 'Downloading...'

          const res = await item.provider.download(url || item.link, item)
          const progress = new ProgressBar(':percent :bar Eta: :eta', {
            complete: String.fromCharCode(9608),
            incomplete: String.fromCharCode(9617),
            head: '',
            total: +res.headers['content-length'] || 0,
            widthLine: process.stderr.columns - 21,
          })

          const file = createWriteStream(path.join(this.dir, `${item.title} [${item.provider.name}].mp3`))

          res.data
            .on('data', c => {
              progress.total = +res.headers['content-length'] || 0
              task.title = 'Downloading... '+progress.tick(c.length)
            })
            .pipe(file)

          return new Promise((resolve) => res.data.on('end', resolve))
        }
      }
    ])
  }
}

module.exports = CliApplication