const express = require("express");
const fs = require("fs");
const path = require("path");
const request = require("request");
const http = require("https");
const axios = require("axios");

const port = 2022;

const { platform } = require('os');
const { exec } = require('child_process');

const WINDOWS_PLATFORM = 'win32';
const MAC_PLATFORM = 'darwin';
const ANDROID_PLATFORM = 'android';

const osPlatform = platform();


const httpsOptions = {
  key: fs.readFileSync('./security/key.pem', "utf-8"),
  cert: fs.readFileSync('./security/cert.pem', "utf-8")
}

const app = express();


const indexHTML = fs.readFileSync(path.join(__dirname, "404.html"), { encoding: "utf8" });
const html = indexHTML;
const handlerRequest = (url, bot, req, res) => {
  if (bot == true) {
    const blacklist = [
      'entitlements/gifts',
      'outbound-promotions/codes',
      'experiments',
      'entitlements',
      'subscription-plans',
      'subscription-slots',
      'science',
      'affinities',
      'users/@me/harvest',
      'oauth2',
    ].some(path => url.includes(path));
    if (blacklist) return res.status(404).send({
      message: 'Bot is not authorized to access this endpoint :))'
    });
    if (url.includes('application-commands/search')) {
      return res.status(200).send({
        "applications": [],
        "application_commands": [],
        "cursor": null
      });
    } else if (url.includes('/profile')) {
      return res.status(200).send({
        user: {},
        connected_accounts: [],
        premium_since: null,
        premium_type: null,
        premium_guild_since: null,
        profile_themes_experiment_bucket: -1,
        user_profile: {}
      });
    } else if (
      [
        'users/@me/mentions',
        'billing/',
        'activities/guilds',
        'interactions',
        'premium/subscriptions',
        'relationships',
        'messages/search',
      ].some(path => url.includes(path))
    ) {
      return res.status(200).send([]);
    } else if (
      url.includes('settings-proto') ||
      url.includes('users/@me/settings')
    ) {
      return res.status(200).send({});
    } else if (url.includes('/threads/search?archived=true')) {
      const cid = /\d{17,19}/.exec(url)[0];
      axios.get(`https://discord.com/api/v9/channels/${cid}/threads/archived/public`, {
        headers: {
          authorization: req.headers.authorization,
          'user-agent': req.headers['user-agent']
        },
      })
        .then(response => {
          res.status(200).send(response.data);
        })
        .catch(err => {
          res.status(404).send({
            message: err.message,
            error: err.stack,
            debug: {
              channelId: cid,
            }
          });
        })
    }
    else if (url.includes('/ask')) {
      return res.status(200).send({ token: null })
    }
    else if (url.includes('billing/country-code')) {
      return res.status(200).send({
        country_code: "VN"
      });
    } else if (url.includes('logout')) {
      return res.status(200).send('');
    }
    else {
      return req.pipe(request("https://discord.com" + url)).pipe(res);
    }
  }
}


app.all('/d/*', function (req, res) {
  const str = req.originalUrl;
  const trs = str.slice('\x32');
  console.log('URL Request', trs);
  if (req.headers?.authorization) {
    req.headers.authorization = `Bot ${req.headers.authorization}`;
    delete req.headers['User-Agent'];
    req.headers['user-agent'] = 'DiscordBot (https://nodejs.org, 16.0.0)'
  }
  handlerRequest(trs, true, req, res);
});
app.all('/sticker*', function (req, res) {
  const str = req.originalUrl;
  const trs = str;
  req.pipe(request("https://discord.com" + trs)).pipe(res);
});
app.all('/asset*', function (req, res) {
  const str = req.originalUrl;
  const trs = str;
  console.log('Require Assets:', trs);
  if (trs.includes('02be0d5b4681a76d9def.js') && trs.endsWith('.js')) {
    res.set('Cache-Control', 'no-store');
    console.log('Load script target');
    return res.send(fs.readFileSync('./script/02be0d5b4681a76d9def.js'));
  }
  req.pipe(request("https://discord.com" + trs)).pipe(res);
  /*
  if (trs.endsWith('js')) {
    request("https://discord.com" + trs ,undefined, (err, res, body) => {
      if (err) { return console.log(err); }
      if (body.includes('._handleDispatch=function(')) {
        // /assets/02be0d5b4681a76d9def.js
        console.log('Script target: ', trs);
      }
    });
  }
  */
});
app.all("*", (req, res) => {
  res.send(html);
});

http.createServer(httpsOptions, app)
  .listen(port, () => {
    console.log('Server running at ' + port);
    try {

      let command;
      const url = 'https://127.0.0.1:' + port;

      switch (osPlatform) {
        case WINDOWS_PLATFORM:
          command = `start ${url}`;
          break;
        case MAC_PLATFORM:
          command = `open -a "Google Chrome" ${url}`;
          break;
        case ANDROID_PLATFORM:
          command = `xdg-open ${url}`;
          break;
        default:
          command = `google-chrome --no-sandbox ${url}`;
          break;
      }

      console.log(`Executing command: ${command}`);
      exec(command);
    } catch {
      console.log('Failed to open browser');
    }
  });

// Catch unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(err);
});

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(err);
});