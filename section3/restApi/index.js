/**
 * Primary file for the API
 */

// Dependencies
const http = require('http')
const https = require('https')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder
const config = require('./config')
const routes = require('./routes')
const Handlers = require('./routes/handlers')
const fs = require('fs')
const _data = require('./lib/data')

// TESTING
// @TODO delete this
_data.create('test', 'newFile', {'foo': 'bar'}, (err) => {
  console.log('this was the error ', err)
})

// instantiating the http Server
const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res)
})

// getting the https key and cert
const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem')
}

// start the server and have it start on port depending on NODE_ENV
httpServer.listen(config.httpPort, () => {
  console.log(`The HTTP server is listening on port ${config.httpPort}`)
})

// Instatiate the HTTPS  server
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res)
})

// Start the HTTPS server
httpsServer.listen(config.httpsPort, () => {
  console.log(`The HTTPS server is listening on port ${config.httpsPort}`)
})

// all the server logic for both http and https servers
const unifiedServer = (req, res) => {
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
      payload: buffer
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

      // Log the path thet was requested
      console.log(`Returning this response: `, statusCode, payloadString)
    })
  })
}