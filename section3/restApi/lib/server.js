/**
 * Server-related tasks
 */

// Dependencies
const http = require('http')
const https = require('https')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder
const config = require('./config')
const routes = require('../routes')
const Handlers = require('./handlers')
const fs = require('fs')
const path = require('path')
const Helpers = require('./helpers')
const util = require('util')
const debug = util.debuglog('server')


// Instantiate the server module object
const server = {}

// instantiating the http Server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res)
})

// getting the https key and cert
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
}

// Instatiate the HTTPS  server
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req, res)
})

// all the server logic for both http and https servers
server.unifiedServer = (req, res) => {
  // get the URL and parse it
  const parsedUrl = url.parse(req.url, true)

  // get the path
  const path = parsedUrl.pathname
  // regex times start/ending slash and end spaces
  const trimmedPath = path.replace(/^\/+|\/+s/g, '')

  // Get the query string as an object
  const queryStringObject = parsedUrl.query

  // Get the HTTP method
  const method = req.method.toLowerCase()

  // Get the headers as an Object
  const headers = req.headers

  // Get the payload if there is any
  const decoder = new StringDecoder('utf-8')
  let buffer = ''
  // payload/data comes in as a stream and we're listening for it
  // take every small chunks of that stream decode into utf-8 and add and store
  // in the buffer variable
  req.on('data', (data) => {
    buffer += decoder.write(data)
  })
  // end event gets call with OR without data/payload
  req.on('end', () => {
    buffer += decoder.end()

    // Chose the handler that this request should go to
    // if one is not found use the notFound(404) handler
    const chosenHandler = routes[trimmedPath] || Handlers.notFound

    // Construct the data object 
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: Helpers.parseJsonToObject(buffer)
    }

    // Route the request to the handler specified in the routes
    chosenHandler(data, (statusCode, payload) => {
      // Use the status code called back by the handler or default to 200
      statusCode = typeof statusCode === 'number' ? statusCode : 200
      // Use the paylaod called back by the handler or default to an empty object
      payload = typeof payload === 'object' ? payload : {}

      // Convert payload object to a string
      const payloadString = JSON.stringify(payload)

      // Return the response
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(statusCode)
      res.end(payloadString)

      // If the response is 200, print green otherwise print red
      if (statusCode === 200) {
        debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`)
      } else {
        debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`)
      }
    })
  })
}

// Init script
server.init = () => {
  // Start the HTTP server
  // start the server and have it start on port depending on NODE_ENV
  server.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[36m%s\x1b[0m', `The HTTP server is listening on port ${config.httpPort}`)

  })

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[35m%s\x1b[0m', `The HTTPS server is listening on port ${config.httpsPort}`)
  })
}

// Export module
module.exports = server