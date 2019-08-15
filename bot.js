const tmi = require('tmi.js');
const request = require('request');
const fs = require('fs');

const _config = require('./config.json');
const _pointsFile = require('./points.json');

const _chatters = [];
const _myAuthHeader = {'Client-ID': _config['client-id']};
const _streamerName = _config['streamer-name'];
const _pointsName = _config['points']['name'];
const _pointsInterval = _config['points']['interval'];
// these variables are both assigned later, but I want them in the global scope
let _myId, _target; 

// Define configuration options
const opts = {
  identity: {
    username: _config['bot-name'],
    password: _config['password']
  },
  channels: [
    _config['channel']
  ]
};

getMyId(setMyId);
setInterval(updatePoints, parseInt(_pointsInterval) * 60 * 1000);

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
    _target = target;
  }
  
  if (!_chatters.includes(context['user-id'])) {
    _chatters.push(context['user-id']);
  }

  // Remove whitespace from chat message
  const command = msg.trim();
  // create an array with each word, as seperated by spaces
  const args = command.split(' ');
  // define the command name as the first word and remove it from the list of arguments
  const commandName = args.shift();

  // checks commandName against all defined commands
  switch(commandName) {
    case '!dice':
      const num = calculateRoll(context, args);
      client.say(target, `You rolled a ${num}`);
      break
    case '!wag':
      client.say(target, `Join Wag! for all your dog walking needs! With this link, you get $25 in credit, and you support Joe with a FAT referral bonus! https://wagwalking.app.link/uyxnZKJCKT`);
      break
    case '!rigged':
      client.say(target, 'TheIlluminati The dice are rigged. Try adding the "cheat" argument to your dice roll to even the odds. TheIlluminati');
      break
    case `!${_pointsName}s`:
      let numpoints = 0;
      if (context['user-id'] in _pointsFile) {
        numpoints = _pointsFile[context['user-id']]['points'];
      }
      _client.say(target, `${context['display-name']} you have ${numpoints} ${_pointsName}s`);
      break
    case '!system':
      client.say(target, `You get 1 ${_pointsName} every ${_pointsInterval} minutes for watching. If you type in chat within that time you get 1 additional ${_pointsName} PogChamp`);
      break
    case '!followage':
      checkFollower(context, followage);
      break
    case '!uptime':
      getStartTime(uptime);
      break
    case '!github':
      _client.say(target, `Check out code for my chat bot MrDestructoid and maybe some other stuff: ${_githubLink}`);
      break
    default:
      console.log(`* Unknown command ${commandName}`);
  }
  console.log(`* Executed ${commandName} command`);
}

// function called when bot starts to set _myId global variable
// the first time the bot runs it will query the api to find this value
// then it will save it for the future in the config.json file
// because we are making an api call this function needs to be asynchronous (i.e. have a callback function)
function getMyId(callback) {
  if (_config['channel-id']) {
    callback(_config['channel-id']);
  } else {
    var options = {
      url: `https://api.twitch.tv/helix/users?login=${_config['channel']}`,
      headers: _myAuthHeader
    }
    request(options, function(err, res, body) {
      console.log('error:', err);
      console.log('statusCode:', res && res.statusCode);
      const bodyObj = JSON.parse(body); 
      _config['channel-id'] = bodyObj['data'][0]['id'];
      fs.writeFile('./config.json', JSON.stringify(_config, null, 2), (err) => {
        if (err) return console.log(err);
      });
      callback(_config['channel-id']);
    });
  }
}

// callback function used in getMyId function
// just sets the _myId global variable after we find it
function setMyId(value) {
  _myId = value;
}


// Function called when the "!dice" command is issued
function calculateRoll(context, args) {
  let sides = 6;
  let rigged = false;
  if (args.length > 0) {
    // finds first integer in message and sets sides to that number
    for (let i = 0; i < args.length; i++) {
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
  // the dice are rigged for me unless I say otherwise
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
  let min = 1;
  const max = sides + 1
  if (rigged) {
    min = Math.ceil(sides * 0.75);
  }
  return getRandomInt(min, max);
}

// function to return a random int between min(included) and max(excluded)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min
}

// function called periodically by setInterval() to add points to our viewers
function updatePoints() {
  request(`https://tmi.twitch.tv/group/user/${_config['channel']}/chatters`, function (err, res, body) {
    const bodyObj = JSON.parse(body);
    const usernames = [];
    for (let chatterType in bodyObj.chatters) {
      const viewers = bodyObj.chatters[chatterType];
      for (let i = 0; i < viewers.length; i++) {
        usernames.push(viewers[i]);
      }
    }
    getUserIds(usernames, addPointsToIds);
  });
}

// takes an array of user ids and adds one point to each
// also checks global variable _chatters for a list of chatters
// each chatter gets one point
function addPointsToIds(ids) {
  for (let i = 0; i < ids.length; i++) {
   addPoint(ids[i]);
  }
  // add extra point for people who sent chat messages in last 5 minutes
  // this also clears our list of chatters
  while (_chatters.length) {
    addPoint(_chatters.pop());
  }
  fs.writeFile('./points.json', JSON.stringify(_pointsFile, null, 2), (err) => {
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

// takes an array of usernames and gets the corresponding user id for each one
// the array of ids is passed to the callback function addPointsToIds
function getUserIds(usernames, callback) {
  const userIds = [];
  let queryString = '';
  for (let i = 0; i < usernames.length; i++) {
    if (i > 0) {
      queryString = queryString.concat('&');
    }
    queryString = queryString.concat('login=', usernames[i]);
  }
  const options = {
    url: `https://api.twitch.tv/helix/users?${queryString}`,
    headers: _myAuthHeader
  };
  request(options, function(err, res, body) {
    console.log('error:', err);
    console.log('statusCode:', res && res.statusCode);
    const bodyObj = JSON.parse(body);
    const ids = [];
    const data = bodyObj['data'];
    for (let i = 0; i < data.length; i++) {
      ids.push(data[i]['id']);
    }
    callback(ids);
  });
}

// callback function for getStartTime
// sends to chat either the current uptime if stream is online or an offline message otherwise
function uptime(startTime) {
  if (startTime) {
    const now = new Date();
    const start = new Date(startTime);
    const uptime = Math.abs(start.getTime() - now.getTime());
    const prettyUptime = getTimeDifferencePretty(uptime);
    client.say(_target, `${_streamerName} has been live for ${prettyUptime}`);  
  } else {
    client.say(_target, `The stream is not live. You can follow to receive notifications when ${_streamerName} goes live.`);
  }
}

// This is called when the "!uptime" command is executed
// It could be improved with webhooks to minimize API calls
// by setting a _startTime global variable only when the stream goes on or offline
function getStartTime(callback) {
  let startTime = null;
  const options = {
    url: `https://api.twitch.tv/helix/streams?user_id=${_myId}`,
    headers: _myAuthHeader
  };
  request(options, function(err, res, body) {
    console.log('err:', err);
    console.log('statusCode:', res && res.statusCode);
    const bodyObj = JSON.parse(body);
    if (bodyObj['data'].length) {
      startTime = bodyObj['data'][0]['started_at'];
    }
    callback(startTime);
  });
}

// called when "!followage" command is executed
// queries api to check if a user is following the channel and if so since when
function checkFollower(context, callback) {
  const options = {
    url: `https://api.twitch.tv/helix/users/follows?to_id=${_myId}&from_id=${context['user-id']}`,
    headers: _myAuthHeader
  };
  request(options, function(err, res, body) {
    console.log('error:', err);
    console.log('statusCode:', res && res.statusCode);
    const bodyObj = JSON.parse(body);
    callback(bodyObj['data'], context);
  });
}

// callback function for checkFollower()
// sends to chat either a user's follow age or a non-follower message
function followage(followedData, context) {
  if (followedData.length) {
    const today = new Date();
    const followedDate = new Date(followedData[0]['followed_at']);
    const diffTime = Math.abs(followedDate.getTime() - today.getTime());
    const prettyTimeDiff = getTimeDifferencePretty(diffTime);
    client.say(_target, `${context['display-name']}, you have been following for ${prettyTimeDiff}`);  
  } else {
    client.say(_target, `${context['display-name']}, you do not follow this channel. :(`);
  }
}

// takes time difference in ms and converts to string # years, # months, # days, # hours, # minutes, # seconds
function getTimeDifferencePretty(diffTime) {
  const years = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
  let remMs = diffTime % (1000 * 60 * 60 * 24 * 365);
  const months = Math.floor(remMs / (1000 * 60 * 60 * 24 * 365 / 12));
  remMs = remMs % (1000 * 60 * 60 * 24 * 365 / 12);
  const days = Math.floor(remMs / (1000 * 60 * 60 * 24));
  remMs = remMs % (1000 * 60 * 60 * 24);
  const hours = Math.floor(remMs / (1000 * 60 * 60));
  remMs = remMs % (1000 * 60 * 60)
  const minutes = Math.floor(remMs / (1000 * 60));
  remMs = remMs % (1000 * 60)
  const seconds = remMs / 1000;

  let prettyTime = '';
  let timeUnit = '';
  if (years) {
    timeUnit = ' years, ';
    if (years === 1) {
      timeUnit = ' year, ';
    }
    prettyTime = prettyTime + years + timeUnit;  
  } if (months) {
    timeUnit = ' months, ';
    if (months === 1) {
      timeUnit = ' month, ';
    }
    prettyTime = prettyTime + months + timeUnit;
  } if (days) {
    timeUnit = ' days, ';
    if (days === 1) {
      timeUnit = ' day, ';
    }
    prettyTime = prettyTime + days + timeUnit;
  } if (hours) {
    timeUnit = ' hours, ';
    if (hours === 1) {
      timeUnit = ' hour, ';
    }
    prettyTime = prettyTime + hours + timeUnit;
  } if (minutes) {
    timeUnit = ' minutes, ';
    if (minutes === 1) {
      timeUnit = ' minute, ';
    }
    prettyTime = prettyTime + minutes + timeUnit;
  } 
  prettyTime = prettyTime + seconds + ' seconds';
  return prettyTime;
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}