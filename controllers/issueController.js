var MongoClient = require('mongodb');
var ObjectID = require('mongodb').ObjectID;

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

exports.postIssue = function (req, res) {
  const projectName = req.params.project;
  const data = {
    _id: new ObjectID(),
    issue_title: req.body.issue_title,
    issue_text: req.body.issue_text,
    created_by : req.body.created_by,
    assigned_to: req.body.assigned_to || '',
    status_text: req.body.status_text || '',
    created_on: new Date(),
    updated_on: null,
    open: 'true'
  }

  if( data.issue_title === undefined || 
      data.issue_text === undefined ||
      data.created_by === undefined ) {
   
   res.status(200).send({ failure: 'Missing required info' });
   return;

  } else {

    MongoClient.connect(CONNECTION_STRING)
      .then( db => {
        return db.collection('better_projects');

      })
      .then( projectsCollection => {
        return projectsCollection.findOneAndUpdate(
          { name: projectName },
          { $push: { issues: data }},
          { upsert: true, returnOriginal: false })

      })
      .then( doc => {
        res.status(200).send(doc.value.issues[doc.value.issues.length -1]);
        return doc.value;

      })
      .catch ( err => {
        console.log('error ', err);
        res.status(500).send({status: 'Database error.'})
      });
  }
}

exports.updateIssue = function (req, res) {
  const projectName = req.params.project;
  const { _id, issue_title, issue_text, created_by, assigned_to, status_text, open } = req.body;
  const issueDbFields = { issue_title, issue_text, created_by, assigned_to, status_text, open };
  const data = {};
 
  for (let key in issueDbFields) {
    if(issueDbFields[key] != undefined) {
      data[key] = issueDbFields[key];
    }
  }
  
  if(!Object.keys(data).length > 0) {
    res.status(200).send( 'no updated field sent');
    
    return;  
  }

  let setQuery = {};
  const queryConst = "issues.$";

  data.updated_on =  new Date();
  
  for(let key in data) {
    setQuery[queryConst + "." + key] = data[key];
  }

  MongoClient.connect(CONNECTION_STRING)
    .then( db => {
      return db.collection('better_projects');
    })
    .then( projectsCollection => {
      return projectsCollection.updateOne(
        { name: projectName, "issues._id": new ObjectID(_id) },
        { $set: { ...setQuery }},
        { upsert: true })
      })
      .then( doc => {
        res.status(200).send('successfully updated');
        return;
      })
      .catch( err => {
        console.log('error inserting ', err);
        res.status(500).send({status: 'Database error.'})
      });
}   
  
exports.deleteIssue = function (req, res) {

  const projectName = req.params.project;
  const _id = req.body._id;

  if(!ObjectID.isValid(_id)) {
    res.status(200).send('_id error');
    return;
  }

  MongoClient.connect(CONNECTION_STRING)
    .then( db => {
      return db.collection('better_projects');
    })
    .then (projectsCollection => {
      return projectsCollection.updateOne(
        { name: projectName }, 
        { $pull: { issues: { _id: new ObjectID(_id)}}}
      );
    })
    .then( result => {
      res.status(200).send('deleted ' + _id);
      return;

    })
    .catch( err => {
      console.log('error deletting ', err);
      res.status(500).send({status: 'Database error.'})
    });
}


exports.getIssues = function(req, res) {
  const projectName = req.params.project;
  const { _id, issue_title, issue_text, created_by, assigned_to, status_text, open } = req.query;
  const queryFields = { issue_title, issue_text, created_by, assigned_to, status_text, open };

  const query = {};
    
  for (let key in queryFields) {
    if(queryFields[key] != undefined) {
      query[key] = queryFields[key];
    }
  }

  MongoClient.connect(CONNECTION_STRING)
    .then( db => {
      return db.collection('better_projects');
    })
    .then( projectsCollection => {
      return projectsCollection.find({name: projectName});
    })
    .then( result => {
      return result.toArray();
    })
    .then( array => {

      let filteredArray = array[0].issues.filter( element => {
        for (key in query) {
          if( !(element[key] == query[key])) {
            return false;
          }
        }
        return true;
      });

      res.status(200).send(filteredArray);
      
    })
    .catch( err => {
      console.log('find error', err);
      res.status(500).send({status: 'Database error.'})
    });
}