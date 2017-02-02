'use strict';

const passport = require('passport');
const config = require('config');
// const restify = require('restify');
const fs = require('fs');
const uuid = require('uuid');
const bunyan = require('bunyan');
const PrettyStream = require('bunyan-prettystream');
const session = require('express-session');
const OIDCBearerStrategy = require('passport-azure-ad').BearerStrategy;
const routes = require('./routes');
const express = require('express');
const https = require('https');
const morgan = require('morgan');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');


const app = express();

if (config.env !== 'production') {
  app.use(morgan('dev'));
} else {
  // Combined uses Apache style logs
  app.use(morgan('combined'));
}

var prettyStdOut = process.stdout;
var prettyErrOut = process.stderr;
var streamType = 'stream';
if (config.env !== 'production') {
  prettyStdOut = new PrettyStream();
  prettyStdOut.pipe(process.stdout);
  prettyErrOut = new PrettyStream();
  prettyErrOut.pipe(process.stderr);
  streamType = 'raw';
}

const log = bunyan.createLogger({
        name: config.appName,
        streams: [{
            level: 'debug',
            type: streamType,
            stream: prettyStdOut
        },{
            level: 'error',
            type: streamType,
            stream: prettyErrOut
        }]
});

app.set('port', config.port);
app.use(methodOverride()); // lets you use PUT and DELETE http met
app.use(bodyParser.text());
app.use(bodyParser.json({ type: 'application/json' }));

const users = {};
passport.serializeUser((user, done) => {
    const id = user.sub;
    users[id] = user;
    done(null, id);
});
passport.deserializeUser((id, done) => {
    const user = users[id];
    done(null, user)
});
passport.use(new OIDCBearerStrategy(config.credentials,
    (token, done) => {
      log.debug('Verifying the user');
      return done(null, token);
    }
));

app.use(passport.initialize());
app.use(passport.session());

const httpOptions = {
  key: fs.readFileSync('./src/tools/rsa-key.pem'),
  cert: fs.readFileSync('./src/tools/rsa-cert.pem')
};
var server = https.createServer(httpOptions, app);
server.listen(config.port, config.host);
server.on('error', onError);
server.on('listening', onListening);

new routes(app, passport, log)();

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
  log.info('%s listening at %s', config.appName, server.address().address);
  console.log('Server started on %s', server.address().address);
  console.log(`Test using:\n  curl -kisS ${server.address().address}/hello`);
}
