const dotenv = require("dotenv");
dotenv.config();

const login = require("facebook-chat-api");
const GIFEncoder = require('gifencoder');
var Canvas = require('canvas')
const fs = require('fs');

const WIDTH = 596;
const HEIGHT = 376;

const FRAMES = 7;
const PREDICTIONS = 6;

const upSince = new Date();

login({email: process.env.EMAIL, password: process.env.PASSWORD}, (err, api) => {
    if(err) return console.error(err);

    sendLogMessage(api, "Server is up!");

    api.listenMqtt((err, message) => {
        if (message.type == "message") {
            if (message.body.startsWith("!radar")) {
                api.sendTypingIndicator(message.threadID);
                if (message.body.toLowerCase().includes("předpověď") || message.body.toLowerCase().includes("predpoved")) {
                    createRadarPredictionImage(message, api);
                } else {
                    createRadarImage(message, api);
                }
            }

            if (message.body.startsWith("!status") && message.threadID === process.env.LOG_THREAD_ID) {
                sendStatus(api);
            }
        }
    });
});

function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

function formatCHMIDate(date) {
    return date.getUTCFullYear().toString() +
        pad(date.getUTCMonth() + 1, 2) +
        pad(date.getUTCDate(), 2) + "_" +
        pad(date.getUTCHours(), 2) + 
        pad(date.getUTCMinutes(), 2)
}

async function createRadarImage(message, api) {
    let errorMessageSent = false;

    let images = [];
    const bg = new Canvas.Image();
    bg.onload = ()=> {
        console.log("Loaded background map");
    };
    bg.onerror = (error)=> {
        console.error(error);
    };
    bg.src = "./src/mapa.png";

    let earliestDate = new Date();
    earliestDate.setMinutes(Math.floor(earliestDate.getMinutes() / 10) * 10);

    const pushNew = () => {
        images.push({
            image: new Canvas.Image(),
            time: earliestDate + 0
        });

        images[images.length - 1].image.onload = onload;
        images[images.length - 1].image.onerror = onerror;
        images[images.length - 1].image.src = "https://www.in-pocasi.cz/data/chmi_v2/" + formatCHMIDate(earliestDate) + "_r.png";
        earliestDate.setMinutes(earliestDate.getMinutes() - 10);
    }

    const onload = () => {
        const alreadyLoaded = images.reduce((prev, image) => (image.image.complete ? 1 : 0) + prev, 0);
        console.log("Loaded image " + alreadyLoaded + " of " + FRAMES);
        if (alreadyLoaded >= FRAMES) {
            const timeFrom = new Date(images[images.length - 1].time);
            const timeTo = new Date(images[0].time);
            const title = "Aktuální radarový snímek (" +
                timeFrom.getHours() + ":" + pad(timeFrom.getMinutes(), 2) + " - " +
                timeTo.getHours() + ":" + pad(timeTo.getMinutes(), 2) + ")";

            finishGifCreation(message, api, images.filter((img) => img.image.complete), bg, title);
        }
    };

    const onerror = () => {
        if (images.length > FRAMES * 2) {
            if (!errorMessageSent) {
                sendErrorMessage(api, message.threadID, "createRadarImage - remote server error");
                errorMessageSent = true;
            }
        } else {
            console.log("Image doesn't (yet?) exist, moving back...");
            pushNew();
        }
    }

    for (let i = 0; i < FRAMES; i++) {
        pushNew();
    }
}

async function createRadarPredictionImage(message, api) {
    let errorMessageSent = false;

    let images = [];
    const bg = new Canvas.Image();
    bg.onload = ()=> {
        console.log("Loaded background map");
    };
    bg.onerror = (error)=> {
        console.error(error);
    };
    bg.src = "./src/mapa.png";

    const onload = () => {
        const alreadyLoaded = images.reduce((prev, image) => (image.image.complete ? 1 : 0) + prev, 0);
        console.log("Loaded image " + alreadyLoaded + " of " + PREDICTIONS);
        if (alreadyLoaded == PREDICTIONS) {
            const title = "Předpověď radarových dat";
                
            finishGifCreation(message, api, images.filter((img) => img.image.complete), bg, title);
        }
    };

    const onerror = () => {
        if (!errorMessageSent) {
            sendErrorMessage(api, message.threadID, "createRadarPredictionImage - remote server error");
            errorMessageSent = true;
        }
    }

    for (let i = PREDICTIONS - 1; i >= 0; i--) {
        images.push({
            image: new Canvas.Image(),
            time: 0
        });

        images[images.length - 1].image.onload = onload;
        images[images.length - 1].image.onerror = onerror;
        images[images.length - 1].image.src = "https://www.in-pocasi.cz/data/chmi_v2/pred_" + i + ".png";
    }
}

async function finishGifCreation(message, api, images, bg, title) {
    const encoder = new GIFEncoder(WIDTH, HEIGHT);
    const url = 'temp/' + (new Date().valueOf()).toString() + '.gif';
    encoder.createReadStream().pipe(fs.createWriteStream(url));

    encoder.start();
    encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat
    encoder.setDelay(500);  // frame delay in ms
    encoder.setQuality(6); // image quality. 10 is default.
    
    const canvas = Canvas.createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    
    images.reverse().forEach((img) => {
        ctx.drawImage(bg, -2, -2);
        ctx.drawImage(img.image, -2, -2);
        encoder.addFrame(ctx);
    })

    encoder.finish();

    setTimeout(() => {
        var msg = {
            body: title,
            attachment: fs.createReadStream(url)
        }
        api.sendMessage(msg, message.threadID);
        console.log("Radar image sent!");
    }, 500)
}

function sendLogMessage(api, message) {
    console.log(message);

    if (process.env.LOG_THREAD_ID) {
        const debugMsg = {
            body: "*[LOG]* " + message
        }
        api.sendMessage(debugMsg, process.env.LOG_THREAD_ID);
    }
}

function sendErrorMessage(api, threadId, message) {
    console.warn(message);
    const msg = {
        body: "Jejda, něco se pokazilo, zkus to prosím za chvíli :)"
    }
    api.sendMessage(msg, threadID);

    if (process.env.LOG_THREAD_ID) {
        const debugMsg = {
            body: "*[ERR]* " + message
        }
        api.sendMessage(debugMsg, process.env.LOG_THREAD_ID);
    }
}

function sendStatus(api) {
    const debugMsg = {
        body: "*System is up* since " + upSince.toUTCString()
    }
    api.sendMessage(debugMsg, process.env.LOG_THREAD_ID);
}