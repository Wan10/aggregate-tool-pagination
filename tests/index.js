'use strict';

let mongoose = require('mongoose');
let expect = require('chai').expect;
let mongooseAggregatePaginate = require('../index');

let MONGO_URI = 'mongodb://127.0.0.1/db_tool_test';

let AuthorSchema = new mongoose.Schema({
  name: String
});
let Author = mongoose.model('Author', AuthorSchema);

let BookSchema = new mongoose.Schema({
  title: String,
  date: Date,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'Author'
  }
});

BookSchema.plugin(mongooseAggregatePaginate);

let Book = mongoose.model('Book', BookSchema);

describe('mongoose-aggregate-tool', function () {

  before(function (done) {
    mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true
    }, done);
  });

  before(function (done) {
    mongoose.connection.db.dropDatabase(done);
  });

  before(function () {
    let book, books = [];
    let date = new Date();
    return Author.create({
      name: 'wan10'
    }).then(function (author) {
      for (let i = 1; i <= 100; i++) {
        book = new Book({
          title: 'Book #' + i,
          date: new Date(date.getTime() + i),
          author: author._id
        });
        books.push(book);
      }
      return Book.create(books);
    });
  });

  afterEach(function () {

  });

  it('promise return test', function () {
    let aggregate = Book.aggregate([{
      $match: {
        title: {
          $in: [/Book/i]
        }
      }
    }])
    let req = { helpers: {}, lstParams: {} };
    let options = {};
    let promise = Book.aggregateTool(req, aggregate, options);
    expect(promise.then).to.be.an.instanceof(Function);
  });

  it('callback test', function (done) {
    let aggregate = Book.aggregate([{
      $match: {
        title: {
          $in: [/Book/i]
        }
      }
    }])
    let req = { helpers: {}, lstParams: {} };
    let options = {};
    Book.aggregateTool(req, aggregate, options, function (err, result) {
      expect(err).to.be.null;
      expect(result).to.be.an.instanceOf(Object);
      done();
    });
  });

  describe('paginates', function () {

    it('with global limit and page', function () {

      let query = [{
        $match: {
          title: {
            $in: [/Book/i]
          }
        }
      }, {
        $sort: {
          date: 1
        }
      }]
      let aggregate = Book.aggregate(query)

      let req = {
        helpers: {
          AddFields: [{
            $addFields: { wan: 'LTV' }
          }],
          PageOptions: true
        },
        limit: 10, 
        page: 2
      };
      let options = { allowDiskUse: true };

      Book.aggregateTool(req, aggregate, options).then((result) => {
        expect(result.limit).to.equal(10);
        expect(result.page).to.equal(2);
        expect(result.docs[0].title).to.equal('Book #11');
        expect(result.docs[0].wan).to.equal('LTV');
        expect(result.docs).to.have.length(10);
        expect(result.totalDocs).to.equal(100);
        expect(result.hasPrevPage).to.equal(true);
        expect(result.hasNextPage).to.equal(true);
        expect(result.prevPage).to.equal(1);
        expect(result.nextPage).to.equal(3);
        expect(result.totalPages).to.equal(10);
      });
    });

    it('pagination with multiple action, lookup success', function () {

      let query = [{
        $match: {
          title: {
            $in: [/Book/i]
          }
        }
      }]
      let aggregate = Book.aggregate(query)

      let req = {
        helpers: {
          AddFields: [{
            $addFields: { wan: 'LTV' }
          }],
          Populate: [{
            ref: "authors"
            , localField: "$author"
            , foreignField: "$_id"
            , virtualName: "author_detail"
            , unwind: true
          }],
          PageOptions: true
        },
        imit: 10
        , page: 2
      };
      let options = { allowDiskUse: true };

      let promise = Book.aggregateTool(req, aggregate, options)
      promise.then((result) => {
        expect(result.limit).to.equal(10);
        expect(result.page).to.equal(2);
        expect(result.docs[0].title).to.equal('Book #11');
        expect(result.docs[0].wan).to.equal('LTV');
        expect(result.docs).to.have.length(10);
        expect(result.totalDocs).to.equal(100);
        expect(result.docs[0].author_detail.name).to.equal('wan10');
        expect(result.hasPrevPage).to.equal(true);
        expect(result.hasNextPage).to.equal(true);
        expect(result.prevPage).to.equal(1);
        expect(result.nextPage).to.equal(3);
        expect(result.totalPages).to.equal(10);
      });
    });

    it('get pipeline | Callback', function () {

      let query = [{
        $match: {
          title: {
            $in: [/Book/i]
          }
        }
      }]
      let aggregate = Book.aggregate(query)

      let req = {
        helpers: {
          AddFields: [{
            $addFields: { wan: 'LTV' }
          }],
          Populate: [{
            ref: "authors"
            , localField: "$author"
            , foreignField: "$_id"
            , virtualName: "author_detail"
            , unwind: true
          }],
          PageOptions: true
        },
        limit: 10
        , page: 2
        , _qr: true
      };
      let options = { allowDiskUse: true };
      Book.aggregateTool(req, aggregate, options, (error,result) => {
        expect(result).to.have.own.property('query');
        expect(result).to.have.own.property('helpers');
        expect(result).to.have.own.property('lstParams');
      })
    });

    it('get pipeline | Sync/Await', async function () {

      let query = [{
        $match: {
          title: {
            $in: [/Book/i]
          }
        }
      }]
      let aggregate = Book.aggregate(query)

      let req = {
        helpers: {
          AddFields: [{
            $addFields: { wan: 'LTV' }
          }],
          Populate: [{
            ref: "authors"
            , localField: "$author"
            , foreignField: "$_id"
            , virtualName: "author_detail"
            , unwind: true
          }],
          PageOptions: true
        },
        limit: 10
        , page: 2
        , _qr: true
      };
      let options = { allowDiskUse: true };
      const result = await Book.aggregateTool(req, aggregate, options);

      expect(result).to.have.own.property('query');
      expect(result).to.have.own.property('helpers');
      expect(result).to.have.own.property('lstParams');
    });

  });
  
  after(function (done) {
    mongoose.disconnect(done);
  });

});