function sendStatus(api) {
    const debugMsg = {
        body: "*System is up*"
    }
    api.sendMessage(debugMsg, process.env.LOG_THREAD_ID);
}

// Export message handler
const onMessage = (message, api) => {
    if (message.body.startsWith("!status") && message.threadID === process.env.LOG_THREAD_ID) {
        sendStatus(api);
    }
}

module.exports = onMessage