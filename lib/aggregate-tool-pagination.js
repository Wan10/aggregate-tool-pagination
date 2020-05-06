'use strict'
/**
 * Mongoose Aggregate Paginate
 * @param  {Aggregate} aggregate
 * @param  {any} options
 * @param  {function} [callback]
 * @returns {Promise}
 */

const Generator = require('./aggregate-generator');
const generator = new Generator();

/**
 *
 * @param {*} req 
 * @param {*} query 
 * @param {*} options 
 * @param {*} callback 
 */
function aggregateTool(req, query, options, callback) {
  const { lstParams, helpers } = req;

  query = query || {};

  const allowDiskUse = options.allowDiskUse || false;

  const isActionSearch = helpers?.Search ? true : false;
  const isActionSearchAll = helpers?.SearchAll ? true : false;
  const isActionSort = helpers?.Sort ? true : false;

  const isActionPipeline = helpers?.Pipeline ? true : false;
  const isPaginationEnabled = helpers?.PageOptions ? true : false;
  const isPaginationSampleEnabled = helpers?.PageOptionsSample ? true : false;

  const q = this.aggregate(query._pipeline);
  if (q.hasOwnProperty('options')) q.options = query.options;
  if (allowDiskUse) q.allowDiskUse(true);

  for (let [key, value] of Object.entries(helpers)) {
    switch (key) {
      case 'AddQuery':
      case 'AddFields':
      case 'Group':
        if (value && !generator.isEmpty(value))
          q.append(...value);
        break;
      case 'Populate':
        if (value && !generator.isEmpty(value))
          q.append(...generator.queryPopulateAge(value));
        break;
      case 'Select':
        if (value && !generator.isEmpty(value))
          q.append(...generator.querySelect(value));
        break;
      case 'SearchAll':
        if (isActionSearchAll) {
          const { search } = lstParams; //search=name:/wan/|gender:/male/
          const { SearchAll } = helpers; //containKeys = ['name', 'gender']
          if (search && search !== "") {
            let params = search.split("|");
            let _search = [];
            if (params.length > 1)
              for (let i = 0; i < params.length; i++)
                _search.push(params[i]);
            else
              _search.push(...params);
            q.append(generator.querySearchAllAge(_search, SearchAll));
          }
        }
        break;
      case 'Search':
        if (isActionSearch) {
          const { search } = lstParams; //search=name:/wan/|gender:/male/
          const { Search } = helpers; //containKeys = ['name', 'gender']
          if (search && search !== "") {
            let params = search.split("|");
            let _search = [];
            if (params.length > 1)
              for (let i = 0; i < params.length; i++)
                _search.push(params[i]);
            else
              _search.push(...params);
            q.append(...generator.querySearchAge(_search, Search));
          }
        }
        break;
      case 'Sort':
        if (isActionSort) {
          const reqSort = lstParams.sort; //sort=createdAt:-1|updatedAt:-1  || sort request
          const optSort = helpers.Sort; //is Object | { createdAt: 1, updateAt: -1}  || sort options
          let sort = {};
          //sort request
          if (reqSort && reqSort !== "") {
            let params = reqSort.split('|');
            params.map(e => {
              let temp = e.split(':');
              sort[temp[0]] = parseInt(temp[1], 10);
            })
          }
          //sort options
          if (optSort && !generator.isEmpty(optSort))
            sort = { ...optSort, ...sort };
          if (!generator.isEmpty(sort)) q.sort(sort);
        }
        break;
      case 'PageOptions':
        {
          let { limit, page } = lstParams;
          const { PageOptions } = helpers;
          const defaultLimit = 10;
          page = parseInt(page || 1, 10) || 1;
          limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : defaultLimit;
          if (isPaginationEnabled)
            q.append(
              ...generator.queryPagingOptions(
                page
                , limit
                , Array.isArray(PageOptions) ? PageOptions : []));
          break;
        }
      case 'PageOptionsSample':
        {
          let { limit, page } = lstParams;
          const { PageOptionsSample } = helpers;
          const defaultLimit = 10;
          page = parseInt(page || 1, 10) || 1;
          limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : defaultLimit;
          if (isPaginationSampleEnabled)
            q.append(
              ...generator.queryPagingOptionsSample(
                page
                , limit
                , Array.isArray(PageOptionsSample) ? PageOptionsSample : []));
          break;
        }
    }
  };

  if (isActionPipeline) return q._pipeline;


  return Promise.all([q.exec()])
    .then(function (values) {
      let result = values[0][0];
      let query = { query: q._pipeline, helpers, lstParams, model: q._model };
      if (typeof callback === 'function') {
        if (lstParams._qr) return callback(null, query);
        return callback(null, result);
      }

      if (lstParams._qr) return query;

      return result;
    })
    .catch(function (reject) {
      if (typeof callback === 'function') {
        return callback(reject)
      }
      return Promise.reject(reject)
    })
}

/**
 * @param {Schema} schema
 */
module.exports = (schema) => {
  schema.statics.aggregateTool = aggregateTool;
  // schema.statics.aggregateToolPaginate = aggregateToolPaginate;
};

module.exports = aggregateTool;