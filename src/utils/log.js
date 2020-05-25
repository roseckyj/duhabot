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
        body: "Jejda, něco se pokazilo, zkus to prosím za chvíli 🤖 :'("
    }
    api.sendMessage(msg, threadId);

    if (process.env.LOG_THREAD_ID) {
        const debugMsg = {
            body: "*[ERR]* " + message + " (https://www.messenger.com/t/" + threadId + ")"
        }
        api.sendMessage(debugMsg, process.env.LOG_THREAD_ID);
    }
}

module.exports = {
    log: sendLogMessage,
    error: sendErrorMessage
}