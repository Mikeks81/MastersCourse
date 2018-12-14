const Handlers = require('../lib/handlers')
// Define a request router
const routes = {
  ping: Handlers.ping,
  users: Handlers.users
}

module.exports = routes