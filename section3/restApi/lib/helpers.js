/**
 * Helpers for various tasks.
 */

// Dependencies
const crypto = require('crypto')
const querystring = require('querystring')
const https = require('https')
const config = require('./config')

// Container for all the helpers
class Helpers {
  // Create a SHA256 hash
  static hash (string) {
    if (typeof string === 'string' && string.length) {
      const hash = crypto.createHmac('sha256', config.hashingSecret)
                          .update(string)
                          .digest('hex')
      return hash
    } else {
      return false
    }
  }

  // Parse a JSON string to an object in all cases, without throwing Error
  static parseJsonToObject (string) {
    try {
      const obj = JSON.parse(string)
      return obj
    } catch (e) {
      return {}
    }
  }

  // Create a string of random aphanumeric characters of a given length
  static createRandomString (strLength) {
    strLength = typeof strLength === 'number' && strLength > 0 ? strLength : false
    if (strLength) {
      // Define all the possible characters that could into a string
      var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'

      // Start the final string
      let str = ''
      for (let i = 0; i <= strLength - 1; i++) {
        // Get a random character from the possibleCharacters string
        const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length)) 
        // Append this character to the final string
        str += randomCharacter
      }

      // Return the final string
      return str
    } else {
      return false
    }
  }

  static sendTwilioSms (phone, msg, callback) {
    phone = phone.trim()
    msg = msg.trim()
    // Validate parameters
    phone = typeof phone === 'string' && phone.length === 10 ? phone : false
    msg = typeof msg === 'string' && msg.length > 0  && msg.length <= 1600 ? msg : false
    if (phone && msg) {
      // Configure the request payload
      const payload = {
        'From': config.twilio.fromPhone,
        'To': `+1${phone}`,
        'Body': msg
      }
      // Stringify the payload
      // Not the same as a JSON stringify - this is a URL stringify
      const stringPayload = querystring.stringify(payload)
      // Configure the request details
      const requestDetails = {
        protocol: 'https:',
        hostname: 'api.twilio.com',
        method: 'POST',
        path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
        auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(stringPayload)
        }
      }

      // Instantiate the request object
      const req = https.request(requestDetails, (res) => {
        // Grab the status of the sent request
        const status = res.statusCode
        // Callback successfully if the request went through
        if (status === 200 || status === 201) {
          callback(false)
        } else {
          callback(`Status code returned was: ${status}`)
        }
      })

      // Bind to the erro event so it doesn't get thrown
      req.on('error', (e) => {
        callback(e)
      })

      // Add the payload
      req.write(stringPayload)

      // End the request | same as sending the request
      req.end()
    } else {
      callback('Given parameters are missing or invalid.')
    }
  }
}

module.exports = Helpers
