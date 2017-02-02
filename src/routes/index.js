'use strict';

const GraphQLHTTP = require('express-graphql');
const mockSchema = require('../data').mockSchema;

module.exports = class Routes {
  constructor(app, passport, log) {

    this.app = app;
    this.passport = passport;
    this.log = log;

    this.initialise = this.initialise.bind(this);
    return this.initialise;
  }

  initialise () {

    this.app.use('/graphql',
      this.passport.authenticate('oauth-bearer',{session: false}),
      GraphQLHTTP({
        schema: mockSchema(),
        graphiql: true
    }));

    this.app.use('/msgraph',
      this.passport.authenticate('oauth-bearer',{session: false}),
      GraphQLHTTP({
        schema: mockSchema(),
        graphiql: true
    }));

    this.app.get('/hello', (req, res, next) => {
      this.log.info('helloSecure called by unknown');
      res.send({
        message: `hello whoever you are, you\'ve connected with to your friendly API`,
        authentication: false
      });
      next();
    });

    this.app.get('/helloSecure',
      this.passport.authenticate('oauth-bearer',{session: false}),
      (req, res, next) => {
      this.log.info('helloSecure called by ', req.user.name);
      res.send({
        message: `hello ${req.user.name}, you\'ve authenticated with to your friendly API`,
        authentication: true
      });
      next();
    });
  }
}
