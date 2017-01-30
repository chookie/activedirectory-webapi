'use strict';

const passport = require('passport');
const config = require('config');
const restify = require('restify');
const fs = require('fs');
const uuid = require('uuid');
const bunyan = require('bunyan');
const session = require('express-session');
var OIDCBearerStrategy = require('passport-azure-ad').BearerStrategy;


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
server.use(restify.authorizationParser()); // Looks for authorization headers

server.use(session({
    name: config.appName,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
  	cookie: {secure: true}
}));

// array to hold logged in users and the current logged in user (owner)
var users = {};
var owner = null;

server.use(passport.initialize()); // Starts passport
server.use(passport.session()); // Provides session support

passport.use(new OIDCBearerStrategy(config.credentials,
    (token, done) => {
        log.info('verifying the user');
        log.info(token, 'was the token retreived');
        findById(token.sub, function(err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                // "Auto-registration"
                log.info('User was added automatically as they were new. Their sub is: ', token.sub);
                const id = uuid.v4();
                users[id] = token;
                owner = token.sub;
                return done(null, token);
            }
            owner = token.sub;
            return done(null, user, token);
        });
    }
));

server.listen(config.port, 'localhost', onListening);
server.on('error', onError);
server.on('listening', onListening);


server.get('/hello/:name', (req, res, next) => {
  res.send({message: `hello ${req.params.name}`});
  next();
});

server.get('/helloSecure/:name', passport.authenticate('oauth-bearer', {
    session: false
}), (req, res, next) => {
  res.send({message: `helloSecure ${req.params.name}`});
  next();
});

function findById(id, fn) {
    for (var i = 0, len = users.length; i < len; i++) {
        var user = users[i];
        if (user.sub === id) {
            log.info('Found user: ', user);
            return fn(null, user);
        }
    }
    return fn(null, null);
};

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
  console.log(`Test using:\n  curl -kisS ${server.url}/hello/test`);
}
