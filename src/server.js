'use strict';

const passport = require('passport');
const config = require('config');
const restify = require('restify');
const fs = require('fs');
const uuid = require('uuid');
const bunyan = require('bunyan');

console.log(config.appName);
var log = bunyan.createLogger({
  name: config.appName,
  streams: [
    {
      stream: process.stderr,
      level: "error",
      name: "error"
    },
    {
      stream: process.stdout,
      level: config.credentials.loggingLevel,
      name: "console"
    },]
});

var server = restify.createServer({
  key: fs.readFileSync('./src/tools/rsa-key.pem'),
  certificate: fs.readFileSync('./src/tools/rsa-cert.pem'),
  name: config.appName,
  log: log
});

// Ensure we don't drop data on uploads
server.pre(restify.pre.pause());
server.pre(restify.pre.sanitizePath());
// Handles annoying user agents (curl)
server.pre(restify.pre.userAgentConnection());
server.use(restify.acceptParser(server.acceptable));
server.use(restify.dateParser());
server.use(restify.queryParser());
server.use(restify.gzipResponse());
server.use(restify.bodyParser({
  mapParams: true
})); // Allows for JSON mapping to restify
server.use(restify.CORS());

server.listen(config.port, 'localhost', onListening);
server.on('error', onError);
server.on('listening', onListening);


server.get('/hello/:name', (req, res, next) => {
  res.send({message: `hello ${req.params.name}`});
  next();
});

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      log.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      log.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  log.info('%s listening at %s', server.name, server.url);
  console.log('Server started on %s', server.url);
  console.log(`Test using:\n  curl -k ${server.url}/hello/test`);
}
