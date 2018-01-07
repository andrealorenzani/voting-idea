const express = require('express')
var bodyParser = require('body-parser')
const app = express()
const port = 8080
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

var postdao = require('./post_dao.js')
var cache;

app.post("/post", function (req, res) {
    cache = null;
    var postParam = req.body;
    postParam.timestamp = (new Date()).getTime()
    
    // TODO Validate input!!

    console.log("Inserting: " + JSON.stringify(postParam));
    var insertPromise = postdao.addPost(postParam);
    insertPromise.then(successValue => {
        res.send(successValue);
    }, failureReason => {
        res.status('500').send(failureReason);
    });
});

app.get("/post", function (req, res) {

    var count = function(arr){
        if(!Array.isArray(arr)) return 0;
        else return arr.length;
    }

    function postSort(post1, post2) {
        if (post2.votes != post1.votes) {
            return post2.votes - post1.votes;
        } else {
            return post2.timestamp - post1.timestamp;
        }
    }

    var addUserInfos = function(userId, items){
        var newItems = JSON.parse(JSON.stringify(items));
        var result = newItems.map(function(item){
            // TODO: to be discussed and validated
            if(item.up && item.up.indexOf(userId) > -1) {
                item.yourVote="up";
            }
            else if (item.down && item.down.indexOf(userId) > -1) {
                item.yourVote="down";
            }
            delete(item.up);
            delete(item.down);
            return item;
        });
        return result;
    }

    var userId = req.query.userId;
    // TODO: if posts may expire, we have to update the condition for the cache
    if(cache) {
        console.log("Hitting the cache");
        res.send(addUserInfos(userId, cache));
        return;
    }
    var allPosts = postdao.retrievePosts(userId);
    allPosts.then(posts => {
        console.log("Refreshing the cache");
        posts.map(function(item){
            item.votes = count(item.up) - count(item.down);
        });
        posts.sort(postSort);
        cache = posts;
        res.send(addUserInfos(userId, posts));
    }, failureReason => {
        res.status('500').send(failureReason);
    });
});

app.post("/vote", function (req, res) {
    cache = null;
    var vote = req.body;
    postdao.addVote(vote).then(successValue => {
        res.send(successValue);
    }, failureReason => {
        res.status('500').send(failureReason);
    });
});

app.listen(port, function () {
    console.log('Voting app is running on port ' + port)
    if (process.env.IS_AWS === "Y") {
        postdao.init({"isAws": true})
    } else {
        postdao.init({"isAws": false})
    }
})

process.on('SIGTERM', function() {
    console.log("Closing DB connection");
    postdao.closeDbConnection(function() {
        process.exit(0);
    });
});