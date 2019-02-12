/**
 * create and export configuration variables
 */

// Container for all the environments
let environments = {}

// Staging (default) environement
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'ThisIsASecret',
  maxChecks: 5,
  twilio: {
    accountSid: 'ACb32d411ad7fe886aac54c665d25e5c5d',
    authToken: '9455e3eb3109edc12e3d8c92768f7a67',
    fromPhone: '+15005550006'
  }
}

// Productions environement
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'ThisIsAlsoSecret',
  maxChecks: 5,
  twilio: {
    accountSid: '',
    authToken: '',
    fromPhone: ''
  }
}

// Determin which enviroonment was passed as a command line arg
const currentEnvironment = typeof process.env.NODE_ENV === 'string'
  ? process.env.NODE_ENV.toLowerCase()
  : ''

// Check that the current environement is one of the environments above...
// if not we're passing in the default (Staging)
const environmentToExport = environments[currentEnvironment] || environments.staging

// Export the module
module.exports = environmentToExport
