/**
 * Helpers for various tasks.
 */

// Dependencies
const crypto = require('crypto')
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
      for (let i = 0; i <= strLength; i++) {
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
}

module.exports = Helpers
