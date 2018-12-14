/**
 * lIbrary for storing and editing data
 */

// Declare dependencies

const fs = require('fs')
const path = require('path')
const Helpers = require('./helpers')

class Data {
  // write data to a file 
  static create (dir, file, data, cb) {
    // Open the file for writing
    fs.open(`${this.baseDir}/${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        // Convert data to string
        const stringData = JSON.stringify(data)

        // Write to file and close it
        fs.writeFile(fileDescriptor, stringData, (err) => {
          if (!err) {
            fs.close(fileDescriptor, (err) => {
              !err ? cb(false) : cb('Error closing new file')
            })
          } else {
            cb('Error writing to new file')
          }
        })
      } else {
        cb('Could not create new file, it may already exists')
      }
    })
  }

  // Read data from a file
  static read (dir, file, cb) {
    fs.readFile(`${this.baseDir}/${dir}/${file}.json`, 'utf-8', (err, data) => {
      if (!err && data) {
        const parsedData = Helpers.parseJsonToObject(data)
        cb(false, parsedData)
      } else {
        cb(err, data)
      }
    })
  }

  // Update data inside a file
  static update (dir, file, data, cb) {
    fs.open(`${this.baseDir}/${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        // Convert data to string
        const stringData = JSON.stringify(data)
        // Truncate the file
        fs.truncate(fileDescriptor, (err) => {
          if (!err) {
            // Write to the file and close it
            fs.writeFile(fileDescriptor, stringData, (err) => {
              if (!err) {
                fs.close(fileDescriptor, (err) => {
                  !err ? cb(false) : cb('Error closing the file.')
                })
              } else {
                cb('Error writing to existing file')
              }
            })
          } else {
            cb('Error truncating file')
          }
        })
      } else {
        cb('Could not open the file for updating, it may not exist yet')
      }
    })
  }

  // Delete a file
  static delete (dir, file, cb) {
    // Unlink (delete) the file
    fs.unlink(`${this.baseDir}/${dir}/${file}.json`, (err) => {
      !err ? cb('false') : cb('Error deleting the file')
    })
  } 
}

// Base directory of the data folder
Data.baseDir = path.join(__dirname, '../.data')

// Export the module
module.exports = Data
