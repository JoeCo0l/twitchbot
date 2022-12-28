# twitchbot
A twitch bot with basic commands to enhance the user experience of viewers of my channel.
My bot is adapted from this chat bot tutorial from Twitch https://dev.twitch.tv/docs/irc/

You can install the project dependencies by running "npm install" from the project directory.
If you don't have npm or node.js installed you can refer to the tutorial above for more info.
Running "npm install" installs the dependencies from package.json, including tmi.js (if you're confused looking at the tutorial).

Once you've successfully run "npm install" all you need to do to get your bot up and running is fill in variable settings in config.json.
Our bot.js reads all user-specific info from config.json, and thus does not need to modified.
Note: replace the <> characters from the string, so it looks like this:
 
 "bot-name": "coolbot",

To procede you will need to create a new Twitch account for your bot.
You can use the same email address as your main account if you go to settings > Security and Privacy and select "Enable additional account creation"

"bot-name": your newly created bot account's twitch username, all lowercase 

"password": this is an oauth token for your bot account. 
Go to https://twitchapps.com/tmi/ while logged into your chatbot account to generate this token

"channel": the twitch username of your channel where you want the chatbot to work, all lowercase

"streamer-name": This is the name the bot will use when referring to the streamer, can be stylized, can be same name as "channel" or different. I just use "Joe"

"channel-id": leave this as an empty string. It will be found by querying the api the first time you run the bot, and will then be saved here

"client-id": this is a developer access token used to query the Twitch helix api. It is different than the oauth token from "password"
You need to register your bot as an application with Twitch here https://dev.twitch.tv/console/apps/create.
You can be logged in to your main Twitch account for this process. 
For "Name" you can put whatever your bot's name is. 
"OAuth Redirect URL" can just be set to "localhost" since our application isn't dealing with redirecting users. 
"Category" is obviously chat bot.
Once you've created your application it should be listed under your "applications" tab. Click "manage" and claim your "Client ID"

"points":
 
 "name": the name of your channel's currency, default is "point"
 This also defines the command name for users to check their points, 
 so if it's value is "chinchilla", "!chinchillas" will give users how many chinchillas they have
 Note: the bot assumes to pluralize this word by adding an "s", so if you want your currency to not add an "s",
 you'll have to manually remove the "s" after "${_pointsName}" from bot.js line 71, 72
 
 "interval": How often, in minutes, you want the bot to award points, defaults to 5, must be an integer or the application will break
 
Once you've filled in all the values in config.json, you can run your bot by running "node bot.js" from the project directory
