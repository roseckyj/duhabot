// Load environment variables
const dotenv = require("dotenv");
dotenv.config();

// Keep server running on Heroku
const upkeep = require("./utils/upkeep");
upkeep(process.env.PORT || 80, '0.0.0.0', process.env.UPKEEP_URL, 10000);

// Load log messaging plugin
const admin = require("./utils/log");

// Init facebook bot
const login = require("facebook-chat-api");

login({email: process.env.EMAIL, password: process.env.PASSWORD}, (err, api) => {
    if(err) return console.error(err);
    admin.log(api, "Server is up (" + process.env.UPKEEP_URL + ")");

    api.setOptions({selfListen: true});

    api.listenMqtt((err, message) => {
        if (message.type == "message") {

            // Handle individual commands
            require("./commands/radar")(message, api);
            require("./commands/status")(message, api);
        }
    });
});