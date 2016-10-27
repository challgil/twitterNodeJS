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
  	for(var i = 0; i < obj.length; i++)
  	{
  		if(obj[i].snType == 'TWITTER')
  		{
  			for(var j = 0; j < tweetObj.length; j++)
  			{
  				if(tweetObj[j].id == obj[i].snMsgId)
  					obj[i].messageText = tweetObj[j].text;
  			}
  		}
  	}
  	res.setHeader('Content-Type', 'application/json');
  	res.send(obj);
};

var successTweet = function (data, res, obj) {
  	var tweetObj = JSON.parse(data);
  	var value = JSON.parse("{}");
  	for(var i = 0; i < obj.length; i++)
  	{
  		if(obj[i].snType == 'TWITTER')
  		{
  			for(var j = 0; j < tweetObj.length; j++)
  			{
  				if(tweetObj[j].id == obj[i].snMsgId)
  					value[obj[i].snMsgId] = tweetObj[j].text;
  			}
  		}
  	}
  	res.setHeader('Content-Type', 'application/json');
  	res.send(value);
};

var successPopulateTweet1 = function (data, res, obj) {
  	var tweetObj = JSON.parse(data);
  	var user_id = obj[0].senderProfile.snId;
  	obj[0].messageText = tweetObj[0].text;
  	for(var i = 1; i < obj.length; i++)
  	{
  		if(obj[i].snType == 'TWITTER')
  		{
  			for(var j = 0; j < tweetObj.length; j++)
  			{
  				if(tweetObj[j].id == obj[i].snMsgId)
  					obj[i].messageText = tweetObj[j].text;
  			}
  			user_id = user_id + ',' + obj[i].senderProfile.snId;
  		}
  	}
  	twitter.getCustomApiCall('/users/lookup.json', {user_id}, error, successPopulateTweet, res, obj);
};

var successPopulateTweet = function (data, res, obj) {
  	var tweetObj = JSON.parse(data);
  	for(var i = 0; i < obj.length; i++)
  	{
  		if(obj[i].snType == 'TWITTER')
  		{
  			for(var j = 0; j < tweetObj.length; j++)
  			{
  				if(tweetObj[j].id == obj[i].senderProfile.snId)
  					obj[i].senderProfile.user_handle = tweetObj[j].screen_name;
  			}
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

//Returns the JSON object from the sprinklr stream call with an added field for the tweet text
app.get('/insertTweet', function (request, res1) {

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

	  res.on('data', (d) => {
	  	if(res.statusCode == 200)
	  	{
	  		var id = new String();
	  		try{
			    var obj = JSON.parse(d);
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
			twitter.getCustomApiCall('/statuses/lookup.json', {id}, error, successInsertTweet, res1, obj);
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
})

//Returns a JSON object that is a mapping of tweet ids to tweet text
app.get('/tweet', function (request, res1) {

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

	  res.on('data', (d) => {
	  	if(res.statusCode == 200)
	  	{
	  		var id = new String();
	  		try{
			    var obj = JSON.parse(d);
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
			twitter.getCustomApiCall('/statuses/lookup.json', {id}, error, successTweet, res1, obj);
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
})

//Returns the JSON object from the sprinklr stream call with added fields for the tweet text and user handle.
app.get('/populateTweet', function (request, res1) {

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

	  res.on('data', (d) => {
	  	if(res.statusCode == 200)
	  	{
	  		var id = new String();
	  		try{
			    var obj = JSON.parse(d);
			    id = obj[0].snMsgId;
			    for(var i = 1; i < obj.length; i ++)
				{
					if(obj[i].snType == 'TWITTER')
						id = id + ',' + obj[i].snMsgId;
				}
				twitter.getCustomApiCall('/statuses/lookup.json', {id}, error, successPopulateTweet1, res1, obj);
			}
			catch(err){
				console.log("Error parsing JSON object from sprinklr API call.");
				res1.end("Unable to parse response from sprinklr. Try making the request again with fewer rows.");
			}
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
})
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^End of get handlers.^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port

   console.log("Now listening at http://%s:%s", host, port)
})

