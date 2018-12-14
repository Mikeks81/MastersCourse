// Defiine our hanlders
class Handlers {
  // Sample hander
  static ping(data, callback) {
    // callback a http status code and a payload object
    callback(200)
  }

  // NotFound hanlder
  static notFound(data, callback) {
    // callback a http status code and a payload object
    callback(404)
  }
}

module.exports = Handlers