const Handlers = require('../lib/handlers')
// Define a request router
const routes = {
  ping: Handlers.ping,
  users: Handlers.users,
  tokens: Handlers.tokens,
  checks: Handlers.checks
}

module.exports = routes