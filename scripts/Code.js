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
        result = query(user_name, _dates)
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

function getDayName(num) {
  switch (+num) {
    case 1:
      return '월'
    case 2:
      return '화'
    case 3:
      return '수'
    case 4:
      return '목'
    case 5:
      return '금'
    case 6:
      return '토'
    case 7:
      return '일'
    default:
      return ''
  }
}

function dateFmts(dates = {}) {
  const now = new Date()
  const result = {
    slash: Utilities.formatDate(now, "Asia/Seoul", "M/dd"),
    pad: Utilities.formatDate(now, "Asia/Seoul", "MMdd"),
    dayName: getDayName(Utilities.formatDate(now, "Asia/Seoul", "u")),
    now,
    ...dates
  }
  console.log(`dateFmts: ${result}`)
  return result
}

// chunk([1,2,3,4], 2) => [[1,2],[3,4]]
function chunk(arr, size, cache = []) {
  const tmp = [...arr]
  if (size <= 0) return cache
  while (tmp.length) cache.push(tmp.splice(0, size))
  return cache
}

function query(user_name, _dates) {
  const {now, pad} = dateFmts(_dates)
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
  const data = chunks.header.map(([dayName, _], i) => {
    const off = chunks.off[i]
    const clocks = chunks.clocks[i]
    return {dayName, off, clocks}
  })
  return {status: 'ok', result: {epoch: Math.floor(now / 1000), data}}
}

function main(action, user_name, _dates) {
  const {now, slash, pad, dayName} = dateFmts(_dates)

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
    .findIndex(date => date !== '' ? date ===  dayName : false)

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
