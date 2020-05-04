var aggregateToolPagination = require('./lib/aggregate-tool-pagination')

/**
 * @param {Schema} schema
 */
module.exports = function (schema) {
  schema.statics.aggregateTool = aggregateToolPagination;
};