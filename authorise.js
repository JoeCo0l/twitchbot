const querystring = require('querystring');
const fetch = require("node-fetch");

module.exports = {
  getOAuthData: async function (_config) {
    try {
      const query = querystring.stringify({
        client_id: _config['client-id'],
        client_secret: _config['client-secret'],
        grant_type: `client_credentials`,
        scope: 'user:read:broadcast'
      });
      const url = `https://id.twitch.tv/oauth2/token?${query}`;

      const response = await fetch(url, { method: 'POST' })

      if(!response.ok) throw new Error(response.status)

      const clientOAuthData = await response.json()

      return clientOAuthData
    }
    catch(error) {
      console.log(error)
      return
    }
  }
}