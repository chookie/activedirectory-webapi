'use strict';

const passport = require('passport');
const config = require('config');
const restify = require('restify');
const fs = require('fs');
const uuid = require('uuid');
const bunyan = require('bunyan');
const PrettyStream = require('bunyan-prettystream');
const session = require('express-session');
var OIDCBearerStrategy = require('passport-azure-ad').BearerStrategy;

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

var log = bunyan.createLogger({
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
// server.use(restify.authorizationParser()); // Looks for authorization headers

server.use(session({
    name: config.appName,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
  	cookie: {secure: true}
}));

passport.serializeUser((user, done) => {
    const id = user.sub;
    users[id] = user;
    done(null, id);
});
passport.deserializeUser((id, done) => {
    const user = users[id];
    done(null, user)
});

server.use(passport.initialize());
server.use(passport.session());

passport.use(new OIDCBearerStrategy(config.credentials,
    (token, done) => {
      log.debug('Verifying the user');
      return done(null, token);
    }
));

server.listen(config.port, config.host, onListening);
server.on('error', onError);
server.on('listening', onListening);


server.get('/hello', (req, res, next) => {
  log.info('helloSecure called by ', req.user.name);
  res.send({
    message: `hello ${req.user.name}, you\'ve connected with to your friendly API`,
    authentication: false
  });
  next();
});

server.get('/helloSecure', passport.authenticate('oauth-bearer', {
    session: false
}), (req, res, next) => {
  log.info('helloSecure called by ', req.user.name);
  res.send({
    message: `hello ${req.user.name}, you\'ve authenticated with to your friendly API`,
    authentication: true
  });
  next();
});

function findById(id, fn) {
  if (users.hasOwnProperty(id)) {
    const user = users[id];
    return fn(null, user);
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
  console.log(`Test using:\n  curl -kisS ${server.url}/hello`);
}
