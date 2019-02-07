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

  } else {
    MongoClient.connect(CONNECTION_STRING, (err, db) => {

      if(err) {
        res.status(500).send({ status: 'Database not available.'});
        console.dir(err);

        return;
      }

      let projectsCollection = db.collection('better_projects');

      projectsCollection.findOneAndUpdate(
        { name: projectName },
        { $push: { issues: data }},
        { upsert: true, returnOriginal: false },
        (err, doc) => {
          if(err) {
            
            console.log('error inserting ', err);
            res.status(500).send({status: 'Database error.'})
            return;
          }

          res.status(200).send(doc.value.issues[doc.value.issues.length -1]);

        });
    })
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

  MongoClient.connect(CONNECTION_STRING, (err, db) => {

    if(err) {
      res.status(500).send({ status: 'Database not available.'});
      console.dir(err);

      return;
    }

    let projectsCollection = db.collection('better_projects');

    let setQuery = {};
    const queryConst = "issues.$";

    data.updated_on =  new Date();
    
    for(let key in data) {
      setQuery[queryConst + "." + key] = data[key];
    }

    projectsCollection.updateOne(
      { name: projectName, "issues._id": new ObjectID(_id) },
      { $set: { ...setQuery }},
      { upsert: true },
      (err, doc) => {
        if(err) {
          
          console.log('error inserting ', err);
          res.status(500).send({status: 'Database error.'})
          return;
        }
        
        res.status(200).send('successfully updated');

      });
  });
  }
      
  
exports.deleteIssue = function (req, res) {

  const projectName = req.params.project;
  const _id = req.body._id;

  if(!ObjectID.isValid(_id)) {
    res.status(200).send('_id error');
    return;
  }

  MongoClient.connect(CONNECTION_STRING, (err, db) => {

    if(err) {
      res.status(500).send({ status: 'Database not available.'});
      console.dir(err);

      return;
    }

    let projectsCollection = db.collection('better_projects');

    projectsCollection.deleteOne(
      { name: projectName, "issues._id": new ObjectID(_id) },
      (err, result) => {
        if(err) {
          
          console.log('error deletting ', err);
          res.status(500).send({status: 'Database error.'})
          return;
        }
        
        res.status(200).send('deleted ' + _id);

      });
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

  MongoClient.connect(CONNECTION_STRING, (err, db) => {

    if(err) {
      res.status(500).send({ status: 'Database not available.'});
      console.dir(err);

      return;
    }

    let projectsCollection = db.collection('better_projects');

    projectsCollection.find(
      {name: projectName},
      {issues: { $elemMatch: query}},
      (err, result) => {
        
        if(err) {
          
          console.log('find error', err);
          res.status(500).send({status: 'Database error.'})
          return;
        }

        result.toArray( (err, arr) => {
          res.status(200).send(arr[0].issues);
        });
        
      });
  });
}