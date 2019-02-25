/**
 * Worker related tasks
 */


// Dependencies
const path = require('path')
const fs = require('fs')
const Data = require('./data')
const https = require('https')
const http = require('http')
const Helpers = require('./helpers')
const Logs  = require('./logs')
const url = require('url')

// Instantiate the worker object
const workers = {}

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
  // Get all the checks
  Data.list('checks', (err, checks) => {
    if (!err && checks && checks.length) {
      checks.forEach((check) => {
        // Read in the check data
        Data.read('checks', check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // Pass it to the check validator, and let that function continue or log errors as needed.
            workers.validateCheckData(originalCheckData)
          } else {
            console.log('Error reading one of the cehck\'s data')
          }
        })
      })
    } else {
      console.log('Error: Could not find any checks to process.')
    }
  })
}

// Sanity-check the check-data
workers.validateCheckData = (originalCheckData) => {
  let {id, userPhone, protocol, url, method, successCodes, timeoutSeconds, state, lastChecked} = originalCheckData

  originalCheckData = typeof(originalCheckData) === 'object' && originalCheckData !== null ? originalCheckData : {}
  id = typeof(id) === 'string' && id.trim().length === 20 ? id.trim() : false
  userPhone = typeof (userPhone) === 'string' && userPhone.trim().length === 10 ? userPhone.trim() : false
  protocol = typeof (protocol) === 'string' && ['http', 'https'].indexOf(protocol) > -1 ? protocol.trim() : false
  url = typeof (url) === 'string' && url.trim().length > 0 ? url.trim() : false
  method = typeof (method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(method) > -1 ? method.trim() : false
  successCodes = typeof (successCodes) === 'object' && successCodes instanceof Array && successCodes.length > 0 ? successCodes : false
  timeoutSeconds = typeof (timeoutSeconds) === 'number' && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false

  // Set the keys that may not be set (if the workers have never seen this check before)
  state = typeof (originalCheckData.state) === 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down'
  lastChecked = typeof (originalCheckData.lastChecked) === 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false

  
  // If all the checks pass, pass the data along to the next step in the proces
  if (id && userPhone && protocol && url && method && successCodes && timeoutSeconds) {
    // updating originalCheckData with results from validation
    originalCheckData = {id, userPhone, protocol, url, method, successCodes, timeoutSeconds, state, lastChecked}
    workers.performCheck(originalCheckData)
  } else {
    console.log('Error: One fo the checks is not properly formatted. Skipping it.')
  }
}

// Perform the check, send the originalCheckData and the outcome of the check process, to the next step of the process. 
workers.performCheck = (originalCheckData) => {
  // Prepare the inital check outcome
  let checkOutcome = {
    error: false,
    responseCode: false
  }

  // Mark that the outcome has not been sent yet
  let outcomeSent = false

  // Parse the hostname and the path out of the originalCheckData
  const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true)
  const hostName = parsedUrl.hostname
  const urlPath = parsedUrl.path // we are using "path" and not "pathname" so we get the querystring
  // Construct the request
  const requestDetails = {
    protocol: originalCheckData.protocol+':',
    hostname: hostName,
    method: originalCheckData.method.toUpperCase(),
    path: urlPath,
    timeout: originalCheckData.timeoutSeconds * 1000
  }

  // Instantiate the request object (using either the http or https module)
  const _moduleToUse = originalCheckData.protocol === 'http' ? http : https
  const req = _moduleToUse.request(requestDetails, (res) => {
    // Grab the status of the sent request
    const status = res.statusCode

    // Update the checkOutcome and pass the data along
    checkOutcome.responseCode = status
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome)
      outcomeSent = true
    }
  })

  // Bind to the error event so it doesn't get thrown
  req.on('error', (e) => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: e
    }
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome)
      outcomeSent = true      
    }
  })

  // Bind to the timeout event
  req.on('timeout', (e) => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: 'timeout'
    }
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome)
      outcomeSent = true
    }
  })

  // End the request
  req.end()
}

// Process the check outcome, update the check data as needed, trigger an alert if needed.
// Special logic for accomadating for a check that has never been tested before (do NOT alert for that).

workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  const {error, responseCode} = checkOutcome
  // Decide if the check is considered up or down
  const state = !error && responseCode && originalCheckData.successCodes.indexOf(responseCode) > -1 ? 'up' : 'down'

  // Decide if an alert is warranted
  const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false

  // Log the outcome of the data
  const timeOfCheck = Date.now()
  workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

  // Update the check data
  const newCheckData = {...originalCheckData}
  newCheckData.state = state
  newCheckData.lastChecked = timeOfCheck


  // Save the updates
  Data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (!err) {
      // Send the new check data to the next phanse in the process if needed.
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData)
      } else {
        console.log('Check outcome has not changed, no alert needed.');
      }
    } else {
      console.log('Error trying to save updates to one of the checks.');
    }
  })
}

// Alert the user as to a change in their check status

workers.alertUserToStatusChange = (newCheckData) => {
  const {method, protocol, url, state, userPhone} = newCheckData
  const msg = `Alert: Your check for ${method.toUpperCase()} ${protocol}://${url} is currently ${state}`
  Helpers.sendTwilioSms(userPhone, msg, (err) => {
    if (!err) {
      console.log('Success: User was alerted to a status change in their check via sms: ', msg);
    } else {
      console.log('Error: Could not send an sms alert to use who had a state change in their check');
    }
  })
}


workers.log = (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) => {
  // form the log data
  const logData = {
    check : originalCheckData,
    outcome : checkOutcome,
    state,
    alert: alertWarranted,
    time: timeOfCheck
  }
  
  // Convert data to a string
  const logString = JSON.stringify(logData)
  
  // Determine the name of the log file
  const logfileName = originalCheckData.id
  
  // Append the log string to the file
  Logs.append(logfileName, logString, (err) => {
    if (!err) {
      console.log('Logging to file succeded')
    } else {
      console.log('Logging to file failed');
    }
  })
}

// Rotate aka. compress the log files
workers.rotateLogs = () => {
  // List all the non compressed log files.
  Logs.list(false, (err, logs) => {
    if (!err && logs && logs.length > 0) {
      logs.forEach((logName) => {
        // Compress the data to a different file.
        const logId = logName.replace('.log', '')
        const newFileId = logId+'-'+Date.now()
        Logs.compress(logId, newFileId, (err) => {
          if (!err) {
            // Truncate the log
            Logs.truncate(logId, (err) => {
              if (!err) {
                console.log('Success truncating log file.')
              } else {
                console.log('Error truncating log file.')
              }
            })
          } else {
            console.log('Error compressing one of the log files', err);
          }
        })
      })
    } else {
      console.log('Error : could not find any logs to rotate.');
    }
  })
}

// Timer to execute the log-rotation process once per day
workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs()
  }, 1000 * 60 * 60 * 24)
}

// Timer to execute the worker-process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks()
  }, 1000 * 60)
}

// Init the script
workers.init = () => {
  // Execute all the checks immediately
  workers.gatherAllChecks()

  // Call the loop so the checks will execute later on
  workers.loop()

  // Compress all the logs immediately
  workers.rotateLogs()

  // Call the compression looop so logs will be compressed later on.
  workers.logRotationLoop()
}


// Export the module
module.exports = workers
