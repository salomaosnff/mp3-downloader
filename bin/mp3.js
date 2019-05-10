#!/usr/bin/env node
const Application = require('../lib/cli')
const app = new Application()

;(async () => {
  const results = await app.search(process.argv[2])
  await app.download(results)
  console.log(`Downloads saved in ${app.dir}`)
})()
