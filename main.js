var http = require("http");
var https = require("https");
var Twitter = require('twitter-node-client').Twitter;

var express = require('express');
var app = express();
var fs = require("fs");
var url = require('url');

var temp = {
    "consumerKey": "C4yfynZBK4MFN7pI6vRg6PvPd",
    "consumerSecret": "E6Ui7M3pVaul6s5OJF83ARjOVOROCQ6O8Tr3Cx9wqQiWaaOPFP",
    "accessToken": "3034870369-bvLtn15kjNmCJ85UbkPAPXxpaCBV1HzlIpAOyI3",
    "accessTokenSecret": "MHsg9iZzSKlTaEP0tgxsSE20bSMjY4Ho0BmBVfh6DTke8",
    "callBackUrl": "http://www.placeholdernotrealsite.com"
};
var twitter = new Twitter(temp);

var error = function (err, response, body) {
    console.error('ERROR [%s]', err);
};

//---------------------------------------Success handlers------------------------------------------------------------------

var successInsertTweet = function (data, res, obj) {
  	var tweetObj = JSON.parse(data);
  	var map = {};
  	for(var i = 0; i < tweetObj.length; i++)
  	{
  		map[tweetObj[i].id_str] = tweetObj[i].text;
  	}
  	for(var i = 0; i < obj.length; i++)
  	{
  		if(obj[i].snType == 'TWITTER')
  			obj[i].messageText = map[obj[i].snMsgId];
  	}
  	res.setHeader('Content-Type', 'application/json');
  	res.send(obj);
};

var successTweet = function (data, res, obj) {
  	var tweetObj = JSON.parse(data);
  	var map = {};
  	for(var i = 0; i < tweetObj.length; i++)
  	{
  		map[tweetObj[i].id_str] = tweetObj[i].text;
  	}
  	res.setHeader('Content-Type', 'application/json');
  	res.send(map);
};

var successPopulateTweet = function (data, res, obj) {
  	var tweetObj = JSON.parse(data);
  	var map = {};
  	for(var i = 0; i < tweetObj.length; i++)
  	{
  		map[tweetObj[i].id_str] = tweetObj[i];
  	}
  	for(var i = 0; i < obj.length; i++)
  	{
  		if(obj[i].snType == 'TWITTER')
  		{
  			obj[i].messageText = map[obj[i].snMsgId].text;
  			obj[i].senderProfile.user_handle = map[obj[i].snMsgId].user.screen_name;
  		}
  	}
  	res.setHeader('Content-Type', 'application/json');
  	res.send(obj);
};

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, key");
  next();
});


//------------------------------------Start of handlers for get requests.-----------------------------------------------------------------------

//The actual function that makes the sprinklr and twitter API calls and passes the correct success handler.
var handler = function(request, resp, succ)
{
	var url_parts = url.parse(request.url, true);
	var query = url_parts.query;
	var options = {
		host: 'api2.sprinklr.com',
  		port: 443,
  		path: '/sandbox/api/v1/stream/' + request.query.id + '/feed?start=' + request.query.start + '&rows=' + request.query.rows,
  		method: 'GET',
  		headers: {'Authorization' : request.get('Authorization'), 'key': request.get('key')}
	};
	var req = https.request(options, (res) => {
	  console.log('statusCode:', res.statusCode);
	   var data = '';
	  res.on('data', (d) => {
		data += d;
	  });
	  res.on('end', function(){
	  	if(res.statusCode == 200)
	  	{
	  		var id = new String();
	  		try{
			    var obj = JSON.parse(data);
			    id = obj[0].snMsgId;
			}
			catch(err){
				res1.end("Unable to parse response from twitter. Try making the request again with fewer rows.");
			}
			for(var i = 1; i < obj.length; i ++)
			{
				if(obj[i].snType == 'TWITTER')
					id = id + ',' + obj[i].snMsgId;
			}
			twitter.getCustomApiCall('/statuses/lookup.json', {id}, error, succ, resp, obj);
		}
		else
		{
			res1.send("Call to sprinklr not successful. (Error code: " + res.statusCode + ")");
		}
	  });
	});
	req.end();

	req.on('error', (e) => {
	  console.error(e);
	});
}

//Returns the JSON object from the sprinklr stream call with an added field for the tweet text
app.get('/insertTweet', function (request, res) { handler(request, res, successInsertTweet); })

//Returns a JSON object that is a mapping of tweet ids to tweet text
app.get('/tweet', function (request, res) { handler(request, res, successTweet); })

//Returns the JSON object from the sprinklr stream call with added fields for the tweet text and user handle.
app.get('/populateTweet', function (request, res) { handler(request, res, successPopulateTweet); })

app.get('/', function(req, res){
	fs.readFile('./index.html', function (err, html) {
	    if (err) {
	        throw err; 
	    }       
	        res.writeHeader(200, {"Content-Type": "text/html"});  
	        res.write(html);  
	        res.end();  
    })
})
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^End of get handlers.^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port

   console.log("Now listening at http://%s:%s", host, port)
})

