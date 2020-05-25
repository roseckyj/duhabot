var http = require('http');
var requestify = require('requestify');

const upkeep = async (port, host, upkeepURL, interval) => {
    http.createServer(function (req, res) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write('Server is up!');
        res.end();
    }).listen(port, host, function() {
        console.log('Listening on port %d', port);
    });

    setInterval(() => {
        requestify.get(upkeepURL).then(function(response) {
            //console.info("Upkeep request: ", response.getBody());
        });
    }, interval); 
}

module.exports = upkeep