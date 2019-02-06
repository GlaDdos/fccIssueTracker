var MongoClient = require('mongodb');
var ObjectID = require('mongodb').ObjectID;

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

exports.postIssue = function (req, res) {
  
  const projectName = req.params.project;
  const data = {
    issue_title: req.body.issue_title,
    issue_text: req.body.issue_text,
    created_by : req.body.created_by,
    assigned_to: req.body.assigned_to || '',
    status_text: req.body.status_text || '',
    created_on: new Date(),
    updated_on: null,
    open: 'true'
  }
  
  if(data.issue_title === undefined || 
     data.issue_text === undefined ||
     data.created_by === undefined ) {
    
    res.status(200)
    .send({
      failure: 'Missing required info'
    });
    
  } else {
    
    MongoClient.connect(CONNECTION_STRING, (err, db) => {

      if(err) { 
        res.status(500).send({status: 'Database not available.'})
        console.dir(err);
        return 
      }
      
      var projectCollection = db.collection('projects');
      var issuesCollection = db.collection('issues');
      
      issuesCollection.insertOne(data, (err, doc) => {
        
        if(err) { 
          console.log('Error while inserting issue.');
          res.status(500).send({status: 'Database error.'})
          return;
                      
        } else {
        
          projectCollection.findOneAndUpdate({name: projectName}, {$push: { issues: doc.insertedId.toHexString()}}, {upsert: true}, (err, data) => {
            
            if(err) {
              console.log('error inserting ', err);
              res.status(500).send({status: 'Database error.'})
              return;
            }
          
             res.status(200).send(doc.ops[0]);
          })
        }
      });
    });
    }
  }

exports.updateIssue = function (req, res) {
    const projectName = req.params.project;
    const { _id, issue_title, issue_text, created_by, assigned_to, status_text, open } = req.body;
    
//     if(!ObjectID.isValid(_id) ){
//       res.status(400)
//         .send({
//           error: 'Invalid object id.'
//       });
      
//       return;
//     }
    
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
        res.status(500).send({status: 'Database not available.'})
        console.dir(err);
        return;
      }
      
      
      var issuesCollection = db.collection('issues');
      var projectCollection = db.collection('projects');
      
      projectCollection.findOne({name: projectName}, (err, doc) => {
        if(doc.issues.includes(_id)) { 
           //we can update becouse project has an issue with this id
          issuesCollection.findOneAndUpdate({_id: new ObjectID(_id)}, {$set: {...data, updated_on: new Date()}}, (err, doc) => {
            
            if(err) {
              res.status(200).send('could not update ' + _id);
              return;
              
            } else {
              res.status(200).send('successfully updated');
              return;
            }
            
          });
          
        } else {
          res.status(200).send('could not update ' + _id);
        }
        
      });
      
    });
  }
      
  
exports.deleteIssue = function (req, res) {
    
    const projectName = req.params.project;
    const issueId = req.body._id;
    
    if(!ObjectID.isValid(issueId)) {
      res.status(200).send('_id error');
      return;
    }
    
     MongoClient.connect(CONNECTION_STRING, (err, db) => {

      if(err) { 
        res.status(500).send({status: 'Database not available.'})
        console.dir(err);
        return 
      }
    
       const issuesCollection = db.collection('issues');
       const projectCollection = db.collection('projects');
       
       projectCollection.findOne({name: projectName}, (err, doc) => {
         
         if(doc.issues.includes(issueId)) {
           
            issuesCollection.deleteOne({_id: new ObjectID(issueId)}, (err, id) => {
              if(err) {
                res.status(500).send('could not delete ' + issueId);
                return;
                
              } else {
                
                const issueToRemove = doc.issues.indexOf(issueId);
                
                projectCollection.findOneAndUpdate({name: projectName}, {$pull: { issues: issueId}}, () => {
                  res.status(200).send('deleted ' + issueId);
                  return;
                });
              }
            })
          }
       })
       
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
      res.status(500).send({status: 'Database not available.'})
      console.dir(err);
      return 
    }
    
    const issuesCollection = db.collection('issues');
    const projectCollection = db.collection('projects');
    
    projectCollection.findOne({name: projectName}, (err, doc) => {
      
      if(err) {
        res.status(200).send({status: 'Project doesn\'t exist.'});
        return;
        
      } else {
          
          let issuesId = doc.issues.map( (id) => { return new ObjectID(id); });
          
          query._id = { $in: issuesId};
        
          issuesCollection.find(query, (err, issues) => {
           
            issues.toArray( (err, arr) => {
                res.status(200).send(arr);
            });

          });
      }
    })
  })
}