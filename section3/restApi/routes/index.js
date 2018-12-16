const Handlers = require('../lib/handlers')
// Define a request router
const routes = {
  ping: Handlers.ping,
  users: Handlers.users,
  tokens: Handlers.tokens
}

module.exports = routes