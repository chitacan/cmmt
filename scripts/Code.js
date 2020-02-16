function doGet(e) {
  const {action, user_name} = e.parameter
  if (!action) {
    return createResponse({status: "error", message: "action is required"});
  } else if (!user_name) {
    return createResponse({status: "error", message: "user_name is required"});
  }

  try {
    const result = main(action, user_name)
    console.log(result)
    return createResponse(result)
  } catch (e) {
    return createResponse({status: "error", message: e.message});
  }
}

function main(action, user_name, _dates = {}) {
  const now = new Date()
  const dateFmts = {
    slash: Utilities.formatDate(now, "GMT+9", "M/dd"),
    pad: Utilities.formatDate(now, "GMT+9", "MMdd"),
    ..._dates
  }

  console.log(`dateFmts: ${JSON.stringify(dateFmts)}`)

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheetName = ss.getSheets()
    .map(s => s.getName())
    .find(name => {
      const [from, to] = name.split('~')
      return +dateFmts.pad >= +from && +dateFmts.pad <= +to
    });

  console.log(`targetSheetName: ${targetSheetName}`)

  const targetSheet = ss.getSheetByName(targetSheetName)

  if (targetSheet === null) {
    return {
      status: "error",
      message: `Cannot find sheet for ${dateFmts.pad}`
    }
  }
  const header = targetSheet.getRange('D2:L2')
  const colIndex = header.getValues()
    .flat()
    .findIndex(date => date !== '' ? Utilities.formatDate(date, "GMT+9", "MMdd") === dateFmts.pad : false)

  const todayCol = header.offset(0, colIndex).getColumn()
  const userRow = targetSheet.createTextFinder(user_name).findNext().getRowIndex()
  const targetRange = targetSheet.getRange(userRow, todayCol)
  const clockInRange = targetRange.offset(1, 0)
  const clockOutRange = targetRange.offset(1, 1)
  const hasClockIn = clockInRange.getValue().toString().length > 0;
  const hasClockOut = clockOutRange.getValue().toString().length > 0;

  console.log(`clock in : ${clockInRange.getA1Notation()}`)
  console.log(`clock out: ${clockOutRange.getA1Notation()}`)

  const touchTime = Utilities.formatDate(now, "GMT+9", "HH:mm")
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
      date: dateFmts.slash,
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
