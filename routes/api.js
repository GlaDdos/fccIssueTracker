var expect = require('chai').expect;
var MongoClient = require('mongodb');
var ObjectId = require('mongodb').ObjectID;
var issueController = require('../controllers/issueController.js');

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

module.exports = function (app) {

        app.route('/api/issues/:project')
  
      .get(issueController.getIssues)
      .post(issueController.postIssue)
      .put(issueController.updateIssue)
      .delete(issueController.deleteIssue);
    
};