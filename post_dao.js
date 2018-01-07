var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var PRIVATE_DB_IP = "192.168.0.217";
var PUBLIC_DB_IP = "innovation-voting-mongodb.whitbread.digital";
var url;
var dbConnection;
 
function addPost(postInfo) {
    return new Promise(function (resolve, reject) {
        if (!dbConnection) reject("No database connection");
        dbConnection.collection('post', function(err, collection) {
            collection.insertOne(postInfo).then(function(result) {
                resolve(postInfo._id);
            });
        });
    });
}

function addVote(vote) {
    if(!vote.userId) vote.userId = (new Date()).toISOString();
    return new Promise(function (resolve, reject) {
        if (!dbConnection) reject("No database connection");
            dbConnection.collection('post', function(err, collection) {
            var postQuery = {'_id': new ObjectID(vote.postId)};
            collection.findOne(postQuery, function(err, result) {
                if (err) reject(err);
                if (!result) {
                    reject("Cannot find post with id " + vote.postId);
                    return;
                }
                if(!result.up) result.up = [];
                if(!result.down) result.down = [];
                if(result.up.indexOf(vote.userId)>-1){
                    result.up.splice(result.up.indexOf(vote.userId), 1);
                }
                if(result.down.indexOf(vote.userId)>-1){
                    result.down.splice(result.down.indexOf(vote.userId), 1);
                }
                result[vote.vote].push(vote.userId);
                dbConnection.collection("post").updateOne(postQuery, result, function(err, res) {
                    if (err) reject(err);
                    console.log(vote.userId + " voted '" + result.title + "' " + vote.vote);
                    resolve();
                });
            });
        });
    });
}

function retrievePosts(userId) {
    return new Promise(function (resolve, reject) {
        var query = {};
        if (!dbConnection) reject("No database connection");
        dbConnection.collection('post', function(err, collection) {
            collection.find(query).toArray(function(err, items) {
                resolve(items);
            });
        });
    });
}

function init(config) {
    if (config.isAws) {
        url = "mongodb://" + PRIVATE_DB_IP + ":27017/innovationdb";
    } else {
        url = "mongodb://" + PUBLIC_DB_IP + ":27017/innovationdb";
    }
    console.log(url);

    MongoClient.connect(url, function(err, db) {
        if (err) {
            console.log("!! DB Connection error: " + err);
        } else {
            dbConnection = db;
        }

    });
}

function closeDbConnection(callback) {
    dbConnection.close();
    callback();
}

module.exports = {
    addPost: addPost,
    retrievePosts: retrievePosts,
    init: init,
    addVote: addVote,
    closeDbConnection: closeDbConnection
};