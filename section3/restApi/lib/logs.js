/**
 * a library for storing and rotatiing logs
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')



class Logs {
  
  // Append a string to a file. Creat the file if it doesn't exist.
  static append (file, str, callback) {
    // Open the file for appending.
    fs.open(`${Logs.baseDir}${file}.log`, 'a', (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        // Append to the file and close it.
        fs.appendFile(fileDescriptor, str+'\n', (err) => {
          if (!err) {
            fs.close(fileDescriptor, (err) => {
              if (!err) {
                callback(false)
              } else {
                callback('Error closing the file that was being appended.')
              }
            })
          } else {
            callback('Error appending the file.')
          }
        })
      } else {
        console.log('Could not open file for appending.');
      }
    })
  }

  // List all the logs, and optionally include the compressed file
  static list (includeCompressedLogs, callback) {
    fs.readdir(Logs.baseDir, (err, data) => {
      if (!err && data && data.length > 0) {
        const trimmedFileNames = []
        data.forEach((fileName) => {
          // Add the .log files
          if (fileName.indexOf('.log') > -1) {
            trimmedFileNames.push(fileName.replace('.log', ''))
          }

          // Add on the compressed files .gz files
          if (includeCompressedLogs && fileName.indexOf('.gz.b64') > -1) {
            trimmedFileNames.push(fileName.replace('.gz.b64', ''))
          }
        })

        callback(false, trimmedFileNames)
      } else {
        callback(err, data)
      }
    })
  }

  // Compress the contents of one .log file into a .gz.b64 file within the same directory 
  static compress (logId, newFileId, callback) {
    const sourceFile = logId+'.log'
    const destFile = newFileId+'.gz.b64'

    // Read the source file
    fs.readFile(Logs.baseDir+sourceFile, 'utf8', (err, inputString) => {
      if (!err && inputString) {
        // Compress the data usig gzip
        zlib.gzip(inputString, (err, buffer) => {
          if (!err && buffer) {
            // Send the data to the destination file
            fs.open(Logs.baseDir+destFile, 'wx', (err, fileDescriptor) => {
              if (!err && fileDescriptor) {
                // Write to the destination file
                fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
                  if (!err) {
                    // Close the destination file
                    fs.close(fileDescriptor, (err) => {
                      if (!err) {
                        callback(false)
                      } else {
                        callback(err)
                      }
                    })
                  } else {
                    callback(err)
                  }
                })
              } else {
                callback(err)
              }
            })
          } else {
            callback(err)
          }
        })
      } else {
        callback(err)
      }
    })
  }

  // Decompress the contents of a .gz.b64 file into a string variable
  static decompress (fileId, callback) {
    const fileName = fileId+'.gz.b64'
    fs.readFile(Logs.baseDir+fileName, 'utf8', (err, str) => {
      if (!err && str) {
        // Decompress the data
        const inputBuffer = new Buffer.from(str, 'base64')
        zlib.unzip(inputBuffer, (err, outputBuffer) => {
          if (!err & outputBuffer) {
            // Callback
            const str = outputBuffer.toString()
            callback(false, str)
          } else {
            callback(err)
          }
        })
      } else {
        callback(err)
      }
    })
  }

  // Truncate a log file
  static truncate (logId, callback) {
    fs.truncate(Logs.baseDir+logId+'.log', 0, (err) => {
      if (!err) {
        callback(false)
      } else {
        callback(err)
      }
    })
  }
}

Logs.baseDir = path.join(__dirname, '../.logs/')

module.exports = Logs
