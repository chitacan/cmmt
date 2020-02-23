function doGet(e) {
  const {action, user_name, dates = '{}'} = e.parameter
  if (!action) {
    return createResponse({status: "error", message: "action is required"});
  } else if (!user_name) {
    return createResponse({status: "error", message: "user_name is required"});
  }

  try {
    let result
    const _dates = JSON.parse(dates)
    switch (action) {
      case "QUERY":
        result = query(action, user_name, _dates)
        break;
      default:
        result = main(action, user_name, _dates)
        break;
    }
    console.log(result)
    return createResponse(result)
  } catch (e) {
    return createResponse({status: "error", message: e.message});
  }
}

function dateFmts(dates = {}) {
  const now = new Date()
  return {
    slash: Utilities.formatDate(now, "Asia/Seoul", "M/dd"),
    pad: Utilities.formatDate(now, "Asia/Seoul", "MMdd"),
    now,
    ...dates
  }
}

function chunk(arr, size, cache = []) {
  const tmp = [...arr]
  if (size <= 0) return cache
  while (tmp.length) cache.push(tmp.splice(0, size))
  return cache
}

function query(action, user_name, _dates) {
  const {pad} = dateFmts(_dates)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheetName = ss.getSheets()
    .map(s => s.getName())
    .find(name => {
      const [from, to] = name.split('~')
      return +pad >= +from && +pad <= +to
    });

  console.log(`targetSheetName: ${targetSheetName}`)

  const targetSheet = ss.getSheetByName(targetSheetName)

  if (targetSheet === null) {
    return {
      status: "error",
      message: `Cannot find sheet for ${pad}`
    }
  }

  const header = targetSheet.getRange('D2:M2')
    .getValues()
    .flat()
    .map(d => d === '' ? d : Utilities.formatDate(d, "Asia/Seoul", "MM/dd"))
  const userRow = targetSheet.createTextFinder(user_name).findNext().getRowIndex()
  const targetRange = targetSheet.getRange(userRow, 4, 2, 10)
  const [off, clocks] = targetRange.getValues()

  const chunks = {
    header: chunk(header, 2),
    off: chunk(off, 2),
    clocks: chunk(clocks.map(d => {
      return d === '' ? 0 : Utilities.formatDate(d, "Asia/Seoul", "HH:mm")
    }), 2)
  }
  const result = chunks.header.map(([date, _], i) => {
    const off = chunks.off[i]
    const clocks = chunks.clocks[i]
    return {date, off, clocks}
  })
  return {status: 'ok', result}
}

function main(action, user_name, _dates) {
  const {now, slash, pad} = dateFmts(_dates)

  console.log(`dateFmts: ${now}, ${slash}, ${pad}`)

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheetName = ss.getSheets()
    .map(s => s.getName())
    .find(name => {
      const [from, to] = name.split('~')
      return +pad >= +from && +pad <= +to
    });

  console.log(`targetSheetName: ${targetSheetName}`)

  const targetSheet = ss.getSheetByName(targetSheetName)

  if (targetSheet === null) {
    return {
      status: "error",
      message: `Cannot find sheet for ${pad}`
    }
  }
  const header = targetSheet.getRange('D2:L2')
  const colIndex = header.getValues()
    .flat()
    .findIndex(date => date !== '' ? Utilities.formatDate(date, "Asia/Seoul", "MMdd") === pad : false)

  const todayCol = header.offset(0, colIndex).getColumn()
  const userRow = targetSheet.createTextFinder(user_name).findNext().getRowIndex()
  const targetRange = targetSheet.getRange(userRow, todayCol)
  const clockInRange = targetRange.offset(1, 0)
  const clockOutRange = targetRange.offset(1, 1)
  const hasClockIn = clockInRange.getValue().toString().length > 0;
  const hasClockOut = clockOutRange.getValue().toString().length > 0;

  console.log(`clock in : ${clockInRange.getA1Notation()}`)
  console.log(`clock out: ${clockOutRange.getA1Notation()}`)

  const touchTime = Utilities.formatDate(now, "Asia/Seoul", "HH:mm")
  if (action === 'CLOCK_IN') {
    if (hasClockIn) {
      return {
        status: "error",
        message: "Already CLOCK_IN"
      }
    } else {
      write(clockInRange, touchTime)
    }
  } else {
    if (!hasClockIn) {
      return {
        status: "error",
        message: "Empty CLOCK_IN"
      };
    } else if (hasClockOut) {
      return {
        status: "error",
        message: "Already CLOCK_IN"
      }
    } else {
      write(clockOutRange, touchTime)
    }
  }
  return {
    status: "ok",
    result: {
      date: slash,
      time: touchTime
    }
  };
}

function write(range, text) {
  Logger.log("write %s %s", range.getA1Notation(), text);
  console.log("write %s %s", range.getA1Notation(), text);
  range.setValue(text)
  // https://stackoverflow.com/a/58612765
  SpreadsheetApp.flush();
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
