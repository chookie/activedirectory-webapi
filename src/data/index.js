'use strict';

const tools = require('graphql-tools');
const schemaString = require('./schema').schema;
const mockResolver = require('./mockResolver');

// Make a GraphQL schema with no resolvers

module.exports.mockSchema = function () {

  const mockSchema = tools.makeExecutableSchema({ typeDefs: schemaString });

  // Add mocks, modifies schema in place
  tools.addMockFunctionsToSchema({
    schema: mockSchema,
    mocks: mockResolver,
    // overwrite all resolvers with the mocks
    preserveResolvers: false
  });

  return mockSchema;
}
