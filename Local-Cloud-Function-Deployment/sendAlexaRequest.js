const https = require('https');
const http = require('http');
var player = require('play-sound')(opts = {})

var remoteHost = false;
var action = "translate";
/* set-language or translate */



function httpGet(data) {

    var dataOptions = data;

    return new Promise(function (resolve, reject) {

        var payload = JSON.stringify(dataOptions);

        console.log(payload);

        var options = {
            host: 'localhost',
            port: 8080,
            path: '/',
            method: 'POST',
            timeout: 60000,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length
            }
        };

        if (remoteHost) {
            var options = {
                host: 'us-central1-macgyver-services-production.cloudfunctions.net',
                path: '/NLU_TRANSLATION',
                method: 'POST',
                timeout: 60000,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': payload.length
                }
            };
        }


        // var req = https.request(options, res => {
        var req = http.request(options, res => {
            res.setEncoding('utf8');
            var responseString = "";

            //accept incoming data asynchronously
            res.on('data', chunk => {
                responseString = responseString + chunk;
            });

            //return the data when streaming is complete
            res.on('end', () => {
                console.log("HTTP GET HELPER DATA: " + responseString);
                resolve(JSON.parse(responseString));
            });

        });
        req.write(payload);
        req.end();
    });
}


(async function () {

    var start = Date.now();

    var payload = {
        "action": "set-language",
        "target_language": "French",
        "alexa_username": "test-script"
    };


    if (action == "translate") {
        var payload = {
            "action": "translate",
            "text": "My name is Tim and I am coding in Boston.",
            "gender": "MALE",
            "alexa_username": "test-script"
        };
    }else if(action == "upgrade-user"){
        var payload = {
            "action": "upgrade-user",
            "alexa_username": "test-script"
        };

    }

    var resData = await httpGet(payload);


    console.log(resData);

    if (!!resData.audio_url) {

        console.log("\n\nFetch Time: ");
        console.log(Date.now() - start);


        const execSync = require('child_process').execSync;
        code = execSync('wget ' + resData.audio_url + ' -O translation.mp3');

        // Orate Translation
        player.play('./translation.mp3', function (err) {
            console.log(err);
        })

    } else {

        console.log(JSON.stringify(resData));

    }


}());