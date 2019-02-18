/**
 * Request Handlers
 */
// Dependencies
const Data = require('../lib/data')
const Helpers = require('./helpers')
const config = require('./config')

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

  // Tokens hander
  static tokens (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete']
    if (acceptableMethods.indexOf(data.method) > -1) {
      _Tokens[data.method](data, callback)
    } else {
      callback(405)
    }
  }

  // Tokens hander
  static checks (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete']
    if (acceptableMethods.indexOf(data.method) > -1) {
      _Checks[data.method](data, callback)
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
  // Users - POST
  // Required data: firstName, lastName, phone, password, tosAgreement
  // Optional data: none
  static post (data, callback) {
    // Check that all required fields are type correct and filled out
    let {firstName, lastName, phone, password, tosAgreement} = data.payload
    firstName = typeof (firstName) === 'string' && firstName.trim().length > 0 ? firstName.trim() : false
    lastName = typeof (lastName) === 'string' && lastName.trim().length > 0 ? lastName.trim() : false
    phone = typeof (phone) === 'string' && phone.trim().length === 10 ? phone.trim() : false
    password = typeof (password) === 'string' && password.trim().length > 0 ? password.trim() : false
    tosAgreement = typeof (tosAgreement) === 'boolean' && tosAgreement === true || false

    if (firstName && lastName && phone && password && tosAgreement) {
      // Make sure that the User doesn't already exist
      Data.read('users', phone, (err, data) => {
        if (err) {
          // if err - we haven't a matching entry we'll create one
          // Hash the password
          const hashedPassword = Helpers.hash(password)

          if (hashedPassword) {
            // Create the user ovject
            const userObject = {
              firstName,
              lastName,
              phone,
              password: hashedPassword,
              tosAgreement
            }

            Data.create('users', phone, userObject, (err) => {
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
  // Users - GET
  // Required data: phone, token
  // Optional data; none
  static get (data, callback) {
    // Check that the phone number is valid
    let {phone} = data.queryStringObject
    phone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : false

    if (phone) {
      // Get the token from the headers
      const token = typeof (data.headers.token) === 'string' ? data.headers.token : false
      // Verify the given token is valid for the phone number.
      _Tokens.verfiyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          // Lookup the user.
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
          callback(403, {Error: 'Missing token in header or token is invalid.'})
        }
      })
    } else {
      callback(400, {Error: 'Missing required fields'})
    }
  }

  // Users - PUT
  // Required data: phone
  // Optional data: firstName, lastName, password (at least one must be specified)
  static put (data, callback) {
    // Check for the required field
    let { firstName, lastName, phone, password } = data.payload
    phone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : false

    // Check for the optional fields
    firstName = typeof (firstName) === 'string' && firstName.trim().length > 0 ? firstName.trim() : false
    lastName = typeof (lastName) === 'string' && lastName.trim().length > 0 ? lastName.trim() : false
    password = typeof (password) === 'string' && password.trim().length > 0 ? password.trim() : false

    // Error if the phone is invalid
    if (phone) {
      if (firstName || lastName || password) {
        // Get the token from the headers
        const token = typeof (data.headers.token) === 'string' ? data.headers.token : false
        // Verify the given token is valid for the phone number.
        _Tokens.verfiyToken(token, phone, (tokenIsValid) => {
          if (tokenIsValid) {
            // Lookup the user
            Data.read('users', phone, (err, userData) => {
              if (!err && userData) {
                // Update the fields necessary
                if (firstName) {
                  userData.firstName = firstName
                }
                if (lastName) {
                  userData.lastName = lastName
                }
                if (password) {
                  userData.password = Helpers.hash(password)
                }
    
                // Store the new updates
                Data.update('users', phone, userData, err => {
                  if (!err) {
                    callback(200)
                  } else {
                    console.log(err)
                    callback(500, {Error: 'Could not update the user'})
                  }
                })
              } else {
                callback(400, {Error: 'The spcified User does not exists.'})
              }
            })
          } else {
            callback(403, { Error: 'Missing token in header or token is invalid.' })
          }
        })
      } else {
        callback(400, {Error: 'Missing required fields'})
      }
    } else {
      callback(400, {Error: 'Missing required field'})
    }
  }

  // User - DELETE
  // Required field: phone
  static delete (data, callback) {
    // Check that the phone number is valid
    let { phone } = data.queryStringObject
    phone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : false

    if (phone) {
      // Get the token from the headers
      const token = typeof (data.headers.token) === 'string' ? data.headers.token : false
      // Verify the given token is valid for the phone number.
      _Tokens.verfiyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          Data.read('users', phone, (err, userData) => {
            if (!err && userData) {
              Data.delete('users', phone, err => {
                if (!err) {
                  // Delete each of the checks associated with the user
                  const userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks : []
                  const checksToDelete = userChecks.length
                  if (checksToDelete > 0) {
                    let checksDeleted = 0
                    let deletionsErrors = false
                    // Loop through the checks
                    userChecks.forEach((checkId) => {
                      // Delete the check
                      Data.delete('checks', checkId, (err) => {
                        if (err) {
                          deletionsErrors = true
                        }
                        checksDeleted++
                        if (checksDeleted === checksToDelete) {
                          if (!deletionsErrors) {
                            callback(200)
                          } else {
                            callback(500, {Error: 'Errors encountered while attempting to delete all of the user\'s checks. All checks may have not been deleted from the system successfully.'})
                          }
                        }
                      })
                    })
                  } else {
                    callback(200)
                  }

                } else {
                  callback(500, {Error: 'Could not delete the specified user'})
                }
              })
            } else {
              callback(400, {Error: 'Could not find the specified user'})
            }
          })
        } else {
          callback(403, { Error: 'Missing token in header or token is invalid.' })         
        }
      })
    } else {
      callback(400, { Error: 'Missing required fields' })
    }
  }
}

// Class for all token requests
class _Tokens {
  // Tokens - POST
  // Required data: phone, password
  // Optional data: none
  static post (data, callback) {
    let { phone, password } = data.payload
    phone = typeof (phone) === 'string' && phone.trim().length === 10 ? phone.trim() : false
    password = typeof (password) === 'string' && password.trim().length > 0 ? password.trim() : false
    if (phone && password) {
      // Lookup user who matches that phone number 
      Data.read('users', phone, (err, userData) => {
        if (!err && userData) {
          // Hash the sent password and compare it to the hashed password stored in the user object.
          const hashedPassword = Helpers.hash(password)
          if (hashedPassword === userData.password) {
            // if valid, create a new token with a random name. Set expiration date 1 hour into the future.
            const tokenId = Helpers.createRandomString(20)

            const expires = Date.now() + 1000 * 60 * 60
            const tokenObject = {phone, id: tokenId, expires}
            // Store the token
            Data.create('tokens', tokenId, tokenObject, err => {
              if (!err) {
                callback(200, tokenObject)
              } else {
                callback(500, {Error: 'Could not create a new token.'})
              }
            })
          } else {
            callback(400, {Error: 'Password did not match the specified user\'s stored password.'})
          }
        } else {
          callback(400, {Error: 'Could not find the specified user.'})
        }
      })
    } else {
      callback(400, {Error: 'Missing required field(s)'})
    }
  }
  // Tokens - GET
  // Required Data: id
  // Optional data: none
  static get(data, callback) {
    // Check that the id is valid
    let { id } = data.queryStringObject
    id = typeof id === 'string' && id.trim().length === 20 ? id.trim() : false

    if (id) {
      // Lookup the token
      Data.read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
          callback(200, tokenData)
        } else {
          callback(404)
        }
      })
    } else {
      callback(400, { Error: 'Missing required fields' })
    }
  }
  // Tokens - PUT
  // Require data: id, extend
  // Optional data: none
  static put (data, callback) {
    // Check for the required field
    let { id, extend } = data.payload
    id = typeof id === 'string' && id.trim().length === 20 ? id.trim() : false
    extend = typeof extend === 'boolean' && extend

    if (id && extend) {
      // Look up the token
      Data.read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
          // Check to make sure the toke isn't already expired.
          if (tokenData.expires > Date.now()) {
            // Set the expiration an hour from now
            tokenData.expires = Date.now() + 1000 * 60 * 60

            // Store the updates
            Data.update('tokens', id, tokenData, (err) => {
              if (!err) {
                callback(200)
              } else {
                callback(500, {Error: 'Could not update the token expiration.'})
              }
            })
          } else {
            callback(400, {Error: 'The token has expired and can not be extended.'})
          }
        } else {
          callback(400, {Error: 'Specified token does not exist.'})
        }
      })
    } else {
      callback(400, {Error: 'Missing required fields or fields are invalid.'})
    }
  }
  // Tokens - DELETE
  // Required data: id
  // Optional data: none
  static delete (data, callback) {
    // Check that the phone number is valid
    let { id } = data.queryStringObject
    id = typeof id === 'string' && id.trim().length === 20 ? id.trim() : false
    // Lookup the token
    if (id) {
      Data.read('tokens', id, (err, data) => {
        if (!err && data) {
          Data.delete('tokens', id, err => {
            if (!err) {
              callback(200)
            } else {
              callback(500, { Error: 'Could not delete the specified token' })
            }
          })
        } else {
          callback(400, { Error: 'Could not find the specified token' })
        }
      })
    } else {
      callback(400, { Error: 'Missing required fields' })
    }
  }

  // Verify if a given token is currently valid for a given user.
  static verfiyToken (id, phone, callback) {
    // Look up the token
    Data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        // Check that the token is for the given user and has not expired
        if (tokenData.phone === phone && tokenData.expires > Date.now()) {
          callback(true)
        } else {
          callback(false)
        }
      } else {
        callback(false)
      }
    })
  }
}

class _Checks {
  // Checks POST
  // Required data: protocol, timeoutSeconds, method, successCodes, timeoutSeconds
  // Optional data: none 
  static post (data, callback) {
    // Validate inputs
    const acceptedProtocol = ['http', 'https']
    const acceptedMethods = ['post', 'get', 'put', 'delete']
    let { protocol, url, method, successCodes, timeoutSeconds } = data.payload
    protocol = typeof (protocol) === 'string' && acceptedProtocol.indexOf(protocol) > -1 ? protocol : false
    url = typeof (url) === 'string' && url.trim().length ? url.trim() : false
    method = typeof (method) === 'string' && acceptedMethods.indexOf(method) > -1 ? method : false
    successCodes = typeof (successCodes) === 'object' && successCodes instanceof Array && successCodes.length ? successCodes : false
    timeoutSeconds = typeof (timeoutSeconds) === 'number' && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false
    if (protocol && url && method && successCodes && timeoutSeconds) {
      // Get the token from the headers
      const token = typeof data.headers.token === 'string' ? data.headers.token : false

      // Look up the user by reading the token
      Data.read('tokens', token, (err, tokenData) => {
        if (!err && tokenData) {
          const userPhone = tokenData.phone

          // Lookup the user data
          Data.read('users', userPhone, (err, userData) => {
            if (!err && userData) {
              const userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks : []

              // Verify that the user has less than the max nubmer of checks allowed
              if (userChecks.length < config.maxChecks) {
                // Create a random id for the check
                const checkId = Helpers.createRandomString(20)

                // Create the check object, and include the users phone.
                const checkObject = {
                  id: checkId, userPhone, protocol, url, method, successCodes, timeoutSeconds
                }

                // Save the object
                Data.create('checks', checkId, checkObject, (err) => {
                  if (!err) {
                    // add the check id to the user's object
                    userData.checks = userChecks
                    userData.checks.push(checkId)

                    // Save the new user data
                    Data.update('users', userPhone, userData, (err) => {
                      if (!err) {
                        // Return the data about the check
                        callback(200, checkObject)
                      } else {
                        callback(500, {Error: 'Could not update the user with the new check'})
                      }
                    })

                  } else {
                    callback(500, {Error: 'Could not create the check.'})
                  }
                })
              } else {
                callback(400, {Error: 'The user already has the maximum number of checks (' + config.maxChecks + ')'})
              }
            } else {
              callback(403)
            }
          })
        } else {
          callback(403)
        }
      })
    } else {
      callback(400, {Error: 'Missing required inputs or inputs are invalid.'})
    }
  }

  // Checks GET
  // Required data: id
  // Optional data: none
  static get (data, callback) {
    // Check that the id number is valid
    let { id } = data.queryStringObject
    id = typeof id === 'string' && id.trim().length === 20 ? id.trim() : false
    if (id) {
      // Lookup the check
      Data.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          // Get the token from the headers
          const token = typeof (data.headers.token) === 'string' ? data.headers.token : false
          // Verify the given token is valid and belongs to the user who created the check.
          _Tokens.verfiyToken(token, checkData.userPhone, (tokenIsValid) => {
            if (tokenIsValid) {
              // Return the check data
              callback(200, checkData)
            } else {
              callback(403, { Error: 'Missing token in header or token is invalid.' })
            }
          })
        } else {
          callback(404)
        }
      })
    } else {
      callback(400, { Error: 'Missing required fields' })
    }
  }

  // Checks PUT
  // Required data: id
  // Optional data: protocol, url, method, successCodes, timeoutSeconds (one must be sent)
  static put (data, callback) {
    // Check for the required field
    let { id, protocol, url, method, successCodes, timeoutSeconds } = data.payload
    id = typeof id === 'string' && id.trim().length === 20 ? id.trim() : false

    // Check for the optional fields
    const acceptedProtocol = ['http', 'https']
    const acceptedMethods = ['post', 'get', 'put', 'delete']
    protocol = typeof (protocol) === 'string' && acceptedProtocol.indexOf(protocol) > -1 ? protocol : false
    url = typeof (url) === 'string' && url.trim().length ? url.trim() : false
    method = typeof (method) === 'string' && acceptedMethods.indexOf(method) > -1 ? method : false
    successCodes = typeof (successCodes) === 'object' && successCodes instanceof Array && successCodes.length ? successCodes : false
    timeoutSeconds = typeof (timeoutSeconds) === 'number' && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false

    // Check to make sure id is valid
    if (id) {
      // Check to make sure one or more of the optional fields were sent.
      if (protocol || url || method || successCodes || timeoutSeconds) {
        // Look up the check
        Data.read('checks', id, (err, checkData) => {
          if (!err && checkData) {
            // Get the token from the headers
            const token = typeof (data.headers.token) === 'string' ? data.headers.token : false
            // Verify the given token is valid and belongs to the user who created the check.
            _Tokens.verfiyToken(token, checkData.userPhone, (tokenIsValid) => {
              if (tokenIsValid) {
                // Update the check where neccessary
                if (protocol) {
                  checkData.protocol = protocol
                }

                if (url) {
                  checkData.url = url
                }

                if (method) {
                  checkData.method = method
                }

                if (successCodes) {
                  checkData.successCodes = successCodes
                }

                if (timeoutSeconds) {
                  checkData.timeoutSeconds = timeoutSeconds
                }

                // Store the new update
                Data.update('checks', id, checkData, (err) => {
                  if (!err) {
                    callback(200)
                  } else {
                    callback(500, {Error: 'Could not update the check.'})
                  }
                })
              } else {
                callback(403, { Error: 'Missing token in header or token is invalid.' })
              }
            })
          } else {
            callback(400, {Error: 'Check id did not exist.'})
          }
        })
      } else {
        callback(400, {Error: 'Missing fields to update'})
      }
    } else {
      callback(400, {Error: 'Missing required field.'})
    }
  }
  // Checks DELETE
  // Required data: id
  // Optional data: none
  static delete (data, callback) {
    // Check that the phone number is valid
    let { id } = data.queryStringObject
    id = typeof id === 'string' && id.trim().length === 20 ? id.trim() : false

    if (id) {
      // Lookup the check
      Data.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          // Get the token from the headers
          const token = typeof (data.headers.token) === 'string' ? data.headers.token : false
          // Verify the given token is valid for the phone number.
          _Tokens.verfiyToken(token, checkData.userPhone, (tokenIsValid) => {
            if (tokenIsValid) {
              // Delet the check data
              Data.delete('checks', id, (err) => {
                if (!err) {
                  // Look up the user
                  Data.read('users', checkData.userPhone, (err, userData) => {
                    if (!err && userData) {
                      const userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks : []

                      // Remove the deleted check from the users list of checks
                      const checkPosition = userChecks.indexOf(id)
                      if (checkPosition > -1) {
                        userChecks.splice(checkPosition, 1)
                        // Re-save the user data
                        Data.update('users', checkData.userPhone, userData, (err) => {
                          if (!err) {
                            callback(200)
                          } else {
                            callback(500, {Error: 'Could not update the user.'})
                          }
                        })
                      } else {
                        callback(500, {Error: 'Could not find the check on the user\'s object and could not remove it.'})
                      }
                    } else {
                      callback(500, { Error: 'Could not find the user who created the check. So we could not remove the check from the list of checks on the user object.' })
                    }
                  })
                } else {
                  callback(500, {Error: 'Could not delete the check data.'})
                }
              })
            } else {
              callback(403, { Error: 'Missing token in header or token is invalid.' })
            }
          })
        } else {
          callback(400, {Error: 'The specified check ID does not exist.'})
        }
      })
    } else {
      callback(400, { Error: 'Missing required fields' })
    }
  }
}

module.exports = Handlers
