function humanizeTime (time) {
  time = Math.round(Math.abs(time !== 0 ? time : 0) / 1000)

  if (time <= 0) return `0s`

  const seconds = time % 60
  const minutes = Math.floor(time / 60) % 60
  const hours = Math.floor(time / 60 / 60) % 24
  const days = Math.floor(time / 60 / 60)

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`

  return `${seconds}s`
}

class Progress {
  constructor(format = ':percent :bar', {
    total = 100,
    complete = '=',
    incomplete = '.',
    head = '>',
    widthBar = Infinity,
    renderThrottle = 16,
    widthLine = process.stdout.columns,
    callback = () => { },
    curr = 0
  }) {
    this.curr = curr
    this.format = format
    this.total = total
    this.widthBar = widthBar
    this.widthLine = widthLine
    this.renderThrottle = renderThrottle !== 0 ? (renderThrottle || 16) : 0
    this.start = null
    this.complete = false
    this.callback = callback
    this.lastRender = -Infinity
    this.lastDraw = ''
    this.chars = {
      complete,
      incomplete,
      head: head || (complete || '=')
    }
  }

  tick(len, tokens) {
    if (len !== 0) len = len || 1
    if (this.curr === 0) this.start = Date.now()

    if (typeof len === 'object') {
      tokens = len
      len = 1
    }

    this.render(tokens)

    this.curr += len

    if (this.curr >= this.total) {
      this.render(undefined, true);
      this.complete = true;
      this.callback(this);
    }

    return this.lastDraw
  }

  render(tokens, force) {
    force = force !== undefined ? force : false

    if (tokens) this.tokens = tokens

    let now = Date.now()
    let delta = now - this.lastRender
    
    if (!force && (delta < this.renderThrottle)) {
      return this.lastDraw
    } else {
      this.lastRender = now
    }

    const ratio   = Math.min(Math.max(this.curr / this.total, 0), 1) || 0
    const percent = Math.floor(ratio * 100) || 0
    const elapsed = Date.now() - this.start
    const eta     = (percent == 100) ? 0 : elapsed * (this.total / this.curr - 1)
    const rate    = this.curr / (elapsed / 1000)

    /* populate the bar template with percentages and timestamps */
    const str = this.format
      .replace(':current', this.curr)
      .replace(':total', this.total)
      .replace(':elapsed', isNaN(elapsed) ? '0.0' : (elapsed / 1000).toFixed(1))
      .replace(':eta', humanizeTime(eta))
      .replace(':percent', percent.toFixed(0) + '%')
      .replace(':rate', Math.round(rate))

    let availableSpace = Math.max(0, this.widthLine - str.replace(':bar', '').length)

    if(availableSpace && process.platform === 'win32'){
      availableSpace = availableSpace - 1;
    }

    const width = Math.min(this.widthBar, availableSpace) || 0;
    const completeLength = Math.round(width * ratio);
    let complete = Array(Math.max(0, completeLength + 1)).join(this.chars.complete);
    const incomplete = Array(Math.max(0, width - completeLength + 1)).join(this.chars.incomplete);
    
    if(completeLength > 0) complete = complete.slice(0, -1) + this.chars.head;
    
    this.lastDraw = str.replace(':bar', complete + incomplete);
    
    return this.lastDraw
  }

  update (ratio, tokens) {
    const goal = Math.floor(ratio * this.total);
    const delta = goal - this.curr;

    return this.tick(delta, tokens);
  }

  interrupt (message) {
    this.lastDraw = message
  }
}

module.exports = Progress