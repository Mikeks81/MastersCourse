/**
 * Request Handlers
 */
// Dependencies
const Data = require('../lib/data')
const Helpers = require('./helpers')

// Defiine our Request handlers
class Handlers {
  // Ping hander
  static ping (data, callback) {
    // callback a http status code and a payload object
    callback(200)
  }

  // Users hander
  static users (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete']
    if (acceptableMethods.indexOf(data.method) > -1) {
      _Users[data.method](data, callback)
    } else {
      callback(405)
    }
  }

  // NotFound hanlder
  static notFound(data, callback) {
    // callback a http status code and a payload object
    callback(404)
  }
}

class _Users {
  // Required data: firstName, lastName, phone, password, tosAgreement
  // Optional data: none
  static post (data, callback) {
    // Check that all required fields are type correct and filled out
    const {firstName, lastName, phone, password, tosAgreement} = data.payload
    const _firstName = typeof (firstName) === 'string' && firstName.trim().length > 0 ? firstName.trim() : false
    const _lastName = typeof (lastName) === 'string' && lastName.trim().length > 0 ? lastName.trim() : false
    const _phone = typeof (phone) === 'string' && phone.trim().length === 10 ? phone.trim() : false
    const _password = typeof (password) === 'string' && password.trim().length > 0 ? password.trim() : false
    const _tosAgreement = typeof (tosAgreement) === 'boolean' && tosAgreement === true || false

    if (_firstName && _lastName && _phone && _password && _tosAgreement) {
      // Make sure that the User doesn't already exist
      Data.read('users', _phone, (err, data) => {
        if (err) {
          // if err - we haven't a matching entry we'll create one
          // Hash the password
          const hashedPassword = Helpers.hash(_password)

          if (hashedPassword) {
            // Create the user ovject
            const userObject = {
              firstName: _firstName,
              lastName: _lastName,
              phone: _phone,
              password: hashedPassword,
              tosAgreement: _tosAgreement
            }

            Data.create('users', _phone, userObject, (err) => {
              if (!err) {
                callback(200)
              } else {
                console.log(err)
                callback(500, {Error: 'Could not create the new user.'})
              }
            })
          } else {
            callback(500, {Error: 'Cold not hash the user\'s password'})
          }
        } else {
          callback(400, {Error: 'A user with that phone number already exists.'})
        }
      })
    } else {
      callback(400, {Error: 'Missing required fields'})
    }
  }

  // Required data: phone
  // Optional data; none
  // TODO Only let an authenticated user access their object. Don't let them access anyone elses
  static get (data, callback) {
    // Check that the phone number is valid
    let {phone} = data.queryStringObject
    phone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : false

    if (phone) {
      Data.read('users', phone, (err, data) => {
        if (!err && data) {
          // Remove the has password from the user object before returning it to the request object
          const _data = {...data}
          const {password, ...rest} = _data
          callback(200, rest)
        } else {
          callback(404)
        }
      })
    } else {
      callback(400, {Error: 'Missing require field'})
    }
  }
  static put (data, callback) {

   }
  static delete (data, callback) {

  }
}

module.exports = Handlers