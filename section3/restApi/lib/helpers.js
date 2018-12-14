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
}

module.exports = Helpers
