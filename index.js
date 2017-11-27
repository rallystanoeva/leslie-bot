var schedule = require('node-schedule');
var Twitter = require('twitter-node-client').Twitter;
var express = require('express');
var quotes = require('./src/quotes')();
var config = require('./src/config')();
var app = express();

var twitter = new Twitter(config);

// When server starts up, get last published tweet and use it as initial point.

let lastTweetIndex = 0;

twitter.getUserTimeline({ count: 1, tweet_mode: 'extended' }, errorCallback, data => {
  try {
    const lastTweetText = JSON.parse(data)[0]['full_text'];
    lastTweetIndex = quotes.indexOf(lastTweetText) > -1 ? quotes.indexOf(lastTweetText) : 0;
    console.log(`Resuming from last quote: "${quotes[lastTweetIndex]}".`);
  } catch (e) {
    console.log(`Error trying to get last tweet text: ${e.message}.`);
  }
});

// Web access to server returns last quote.
app.get('/', function(req, res) {
  res.send(`Last quote: "${quotes[lastTweetIndex]}" (${lastTweetIndex}).`);
});

// Schedule to publish a new tweet everyday at 12 GMT (9am Argentina. time)
var everyMinuteJob = schedule.scheduleJob({ hour: 12, minute: 00 }, function() {
  const nextIndex = lastTweetIndex === quotes.length - 1 ? 0 : lastTweetIndex + 1;
  const status = quotes[nextIndex];
  twitter.postTweet({ status }, errorCallback, data => {
    lastTweetIndex = nextIndex;
    console.log(`Just published: "${status}".`);
  });
});

app.listen(3000, function() {
  console.log('Leslie quotes Twitter bot up and running!');
});

sendDM('Bot started!');

function errorCallback(err, response, body) {
  sendDM(`There was an error with Leslie quotes bot: ${JSON.stringify(err)}.`);
}

function sendDM(text, user = '69135372') {
  twitter.doPost(
    'https://api.twitter.com/1.1/direct_messages/new.json',
    { user_id: user, text },
    (err, response, body) => console.log('ERROR [%s]', JSON.stringify(err)),
    data => console.log(`Direct Message sent to user ${user}: "${text}"`)
  );
}
