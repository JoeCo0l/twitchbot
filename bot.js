const tmi = require('tmi.js');
const request = require('request');
const fs = require('fs');

// Define configuration options
const opts = {
  identity: {
    username: '',
    password: 'oauth:'
  },
  channels: [
    ''
  ]
};

var _pointsFile = require('');
var _chatters = [];
var _myId = '';
var _myAuthHeader = {'Client-ID': ''};
var _target = '';

setInterval(updatePoints, 300000);

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot

  if (_target !== target) {
    console.log('new target:', target);
    _target = target;
  }
  
  if (!_chatters.includes(context['user-id'])) {
    _chatters.push(context['user-id']);
  }

  // Remove whitespace from chat message
  const command = msg.trim();
  parts = command.split(' ');
  const commandName = parts[0];
  args = [];
  for (i = 1; i < parts.length; i++) {
    args[i-1] = parts[i];
  }

  // If the command is known, let's execute it
  switch(commandName) {
    case '!dice':
      const num = calculateRoll(context, args);
      client.say(target, `You rolled a ${num}`);
      break
    case '!wag':
      client.say(target, 'Join Wag! for all your dog walking needs! With this link, you get $25 in credit, and you support me with a FAT referral bonus! https://wagwalking.app.link/uyxnZKJCKT');
      break
    case '!rigged':
      client.say(target, 'TheIlluminati The dice are rigged. Try adding the "cheat" argument to your dice roll to even the odds. TheIlluminati');
      break
    case '!points':
      client.say(target, `${context['display-name']} you have ${_pointsFile[context['user-id']]['points']} points`);
      break
    case '!system':
      client.say(target, 'You get 1 point every 5 minutes for watching. If you type in chat within that time you get 1 additional point PogChamp');
      break
    case '!followage':
      checkFollower(context, followage);
      break
    case '!uptime':
      getStartTime(uptime);
      break
    default:
      console.log(`* Unknown command ${commandName}`);
  }
  console.log(`* Executed ${commandName} command`);
}

// Function called when the "dice" command is issued
function calculateRoll(context, args) {
  var sides = 6;
  var rigged = false;
  if (args.length > 0) {
    // finds first integer in message and sets sides to that number
    for (i = 0; i < args.length; i++) {
      var sidesArg = parseInt(args[i]);
      // parseInt on a non-number string returns NaN, a falsey value
      if (sidesArg) {
        sides = sidesArg;
        break
      }
    }
  }
  if (args.includes('cheat')) {
    rigged = true;
  }
  // the dice are rigged unless I say otherwise
  if (context.badges) {
    if ('broadcaster' in context.badges) {
      if (!args.includes('fair')) {
        rigged = true;
      } 
    }
  }
 return rollDice(sides, rigged);
}

function rollDice (sides, rigged=false) {
  var min = 1;
  var max = sides + 1
  if (rigged) {
    min = Math.ceil(sides * 0.75);
  }
  return getRandomInt(min, max);
}

// function to return a random int between min(included) and max(excluded)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min
}

function updatePoints() {
  request('https://tmi.twitch.tv/group/user/xxxxx/chatters', function (err, res, body) {
    var bodyObj = JSON.parse(body);
    var usernames = [];
    for (var chatterType in bodyObj.chatters) {
      var viewers = bodyObj.chatters[chatterType];
      for (i = 0; i < viewers.length; i++) {
        usernames.push(viewers[i]);
      }
    }
    getUserIds(usernames, addPointsToIds);
  });
}

function addPointsToIds(ids) {
  for (i = 0; i < ids.length; i++) {
   addPoint(ids[i]);
  }
  // add extra point for people who sent chat messages in last 5 minutes
  for (i = 0; i < _chatters.length; i++) {
    addPoint(_chatters[i]);
  }
  // reset list of active chatters
  _chatters = [];
  fs.writeFile('', JSON.stringify(_pointsFile, null, 2), (err) => {
    if (err) return console.log(err);
  });
}

function addPoint(id) {
  if (id in _pointsFile) {
    _pointsFile[id]['points'] += 1;
  } else {
    _pointsFile[id] = {'points': 1}
  }
}

function getUserIds(usernames, callback) {
  var userIds = [];
  var queryString = '';
  for (i = 0; i < usernames.length; i++) {
    if (i > 0) {
      queryString = queryString.concat('&');
    }
    queryString = queryString.concat('login=', usernames[i]);
  }
  var options = {
    url: `https://api.twitch.tv/helix/users?${queryString}`,
    headers: _myAuthHeader
  };
  request(options, function(err, res, body) {
    console.log('error:', err);
    console.log('statusCode:', res && res.statusCode);
    var bodyObj = JSON.parse(body);
    var ids = [];
    var data = bodyObj['data'];
    for (i = 0; i < data.length; i++) {
      ids.push(data[i]['id']);
    }
    callback(ids);
  });
}

function uptime(startTime) {
  if (startTime) {
    var now = new Date();
    var start = new Date(startTime);
    var uptime = Math.abs(start.getTime() - now.getTime());
    var prettyUptime = getTimeDifferencePretty(uptime);
    client.say(_target, `Joe has been live for ${prettyUptime}`);  
  } else {
    client.say(_target, 'The stream is not live. You can follow to receive notifications when Joe goes live.');
  }
}

// This is called when the !uptime command is executed
// It could be improved with webhooks to minimize API calls
// by setting a _startTime global variable only when the stream goes on or offline
function getStartTime(callback) {
  startTime = null;
  var options = {
    url: `https://api.twitch.tv/helix/streams?user_id=${_myId}`,
    headers: _myAuthHeader
  };
  request(options, function(err, res, body) {
    console.log('err:', err);
    console.log('statusCode:', res && res.statusCode);
    var bodyObj = JSON.parse(body);
    console.log('body:', bodyObj);
    if (bodyObj['data'].length) {
      startTime = bodyObj['data'][0]['started_at'];
    }
    callback(startTime);
  });
}

function checkFollower(context, callback) {
  var options = {
    url: `https://api.twitch.tv/helix/users/follows?to_id=${_myId}&from_id=${context['user-id']}`,
    headers: _myAuthHeader
  };
  request(options, function(err, res, body) {
    console.log('error:', err);
    console.log('statusCode:', res && res.statusCode);
    var bodyObj = JSON.parse(body);
    console.log('body:', bodyObj);
    callback(bodyObj['data'], context);
  });
}

function followage(followedData, context) {
  if (followedData.length) {
    var today = new Date();
    var followedDate = new Date(followedData[0]['followed_at']);
    var diffTime = Math.abs(followedDate.getTime() - today.getTime());
    console.log(diffTime);
    var prettyTimeDiff = getTimeDifferencePretty(diffTime);
    client.say(_target, `${context['display-name']}, you have been following for ${prettyTimeDiff}`);  
  } else {
    client.say(_target, `${context['display-name']}, you do not follow this channel. :(`);
  }
}

// takes time difference in ms and converts to string ## years, ## months, ## days, ## hours, ## minutes, ## seconds
function getTimeDifferencePretty(diffTime) {
  var years = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
  var remMs = diffTime % (1000 * 60 * 60 * 24 * 365);
  var months = Math.floor(remMs / (1000 * 60 * 60 * 24 * 365 / 12));
  remMs = remMs % (1000 * 60 * 60 * 24 * 365 / 12);
  var days = Math.floor(remMs / (1000 * 60 * 60 * 24));
  remMs = remMs % (1000 * 60 * 60 * 24);
  var hours = Math.floor(remMs / (1000 * 60 * 60));
  remMs = remMs % (1000 * 60 * 60)
  var minutes = Math.floor(remMs / (1000 * 60));
  remMs = remMs % (1000 * 60)
  var seconds = remMs / 1000;

  var returnString = '';
  var timeUnit = '';
  if (years) {
    timeUnit = ' years, ';
    if (years === 1) {
      timeUnit = ' year, ';
    }
    returnString = returnString + years + timeUnit;  
  } if (months) {
    timeUnit = ' months, ';
    if (months === 1) {
      timeUnit = ' month, ';
    }
    returnString = returnString + months + timeUnit;
  } if (days) {
    timeUnit = ' days, ';
    if (days === 1) {
      timeUnit = ' day, ';
    }
    returnString = returnString + days + timeUnit;
  } if (hours) {
    timeUnit = ' hours, ';
    if (hours === 1) {
      timeUnit = ' hour, ';
    }
    returnString = returnString + hours + timeUnit;
  } if (minutes) {
    timeUnit = ' minutes, ';
    if (minutes === 1) {
      timeUnit = ' minute, ';
    }
    returnString = returnString + minutes + timeUnit;
  } 
  returnString = returnString + seconds + ' seconds';
  return returnString;
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}