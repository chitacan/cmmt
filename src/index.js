const {Command, flags} = require('@oclif/command')
const got = require('got')
const M = require('moment')
const _ = require('lodash')
const setup = require('moment-duration-format')
const {cli} = require('cli-ux')
const {writeJSON, readJSON, pathExists} = require('fs-extra')
const {join} = require('path')

setup(M)

class CmmtCommand extends Command {
  get(url, action, user, date) {
    const searchParams = new URLSearchParams([
      ['action', action],
      ['user_name', user],
      ['dates', `{"pad": "${date}"}`]
    ]);
    return got(url, {searchParams}).json()
  }

  getDuration(b, a, offAm = false, offPm = false) {
    if (b === 0 && a === 0) {
      return M.duration(0)
    } else if (b !== 0 && a === 0) {
      const before = M(b, 'HH:mm')
      const after = M()
      const lunch = M('13:00', 'HH:mm')
      return after >= lunch ?
        M.duration(after.diff(before)).subtract(1, 'hours') :
        M.duration(after.diff(before))
    } else if (offAm && offPm) {
      return M.duration(8, 'hours')
    } else if (offAm || offPm) {
      const before = M(b, 'HH:mm')
      const after = M(a, 'HH:mm')
      return M.duration(after.diff(before)).add(4, 'hours')
    } else {
      const before = M(b, 'HH:mm')
      const after = M(a, 'HH:mm')
      return M.duration(after.diff(before)).subtract(1, 'hours')
    }
  }

  workDuration(result) {
    return result.map(d => {
      const {clocks: [b, a], off: [am, pm]} = d
      const duration = this.getDuration(b, a, am, pm)
      return {
        ...d,
        duration: duration.format('HH:mm'),
        mins: duration.format('mm', {trim: false, precision: 1})
      }
    })
  }

  totalDuration(result, today = false) {
    return result
      .filter(d => {
        const {clocks: [b, a]} = d
        return today ? true : a !== 0
      })
      .map(d => {
        const {clocks: [b, a], off: [am, pm]} = d
        return this.getDuration(b, a, am, pm)
      })
      .reduce((p, d) => p.add(M.duration(d)), M.duration())
  }

  async checkConfig() {
    const configPath = join(this.config.configDir, 'config.json')
    const exists = await pathExists(configPath)
    if (!exists) {
      await writeJSON(configPath, {})
    }
    let {url, user} = await readJSON(configPath)
    if (!url) {
      url = await cli.prompt('Sheet URL?')
    }

    if (!user) {
      user = await cli.prompt('User to query?')
    }

    await writeJSON(configPath, {url, user})
    return {url, user}
  }

  async run() {
    const {flags} = this.parse(CmmtCommand)
    const {user, url} = await this.checkConfig()
    const name = flags.name || user
    const date = flags.date || M().format('MMDD')

    cli.action.start('Query Sheet')
    const {status, result, message} = await this.get(url, 'QUERY', name, date)
    cli.action.stop()
    if (status === 'ok') {
      const worked = this.workDuration(result)
      const total = this.totalDuration(result, false)
      const totalWithToday = this.totalDuration(result, true)
      const left = M.duration(40, 'hours').subtract(total)
      const leftWithToday = M.duration(40, 'hours').subtract(totalWithToday)

      this.log('')
      cli.table(worked, {
        date: {},
        duration: {},
        mins: {
          header: '(minutes)'
        }
      })
      this.log('')
      cli.table([
        {
          name: 'total',
          duration: total.format('HH:mm', {trim: false})
        }, {
          name: 'total (+today)',
          duration: totalWithToday.format('HH:mm', {trim: false})
        }, {
          name: 'left',
          duration: left.format('HH:mm', {trim: false})
        }, {
          name: 'left  (+today)',
          duration: leftWithToday.format('HH:mm', {trim: false})
        }
      ], {
        name: {},
        duration: {}
      })
      this.log('')
      this.exit(0)
    } else {
      this.error(message)
    }
  }
}

CmmtCommand.description = `Get commute data from google sheet.

`

CmmtCommand.flags = {
  version: flags.version({char: 'v'}),
  help: flags.help({char: 'h'}),
  name: flags.string({char: 'n', description: 'name to query'}),
  date: flags.string({char: 'd', description: 'date to query'}),
}

module.exports = CmmtCommand
