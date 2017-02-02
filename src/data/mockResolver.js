'use strict';

const casual = require('casual-browserify');

module.exports = {
  Link: () => ({
    title: () => casual.title,
    url: () => casual.url
  })
}
