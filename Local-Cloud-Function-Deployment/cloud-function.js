exports.translate = async (req, res) => {

    var {
        Datastore
    } = require('@google-cloud/datastore');
    var {
        Storage
    } = require('@google-cloud/storage');
    var {
        spawn
    } = require('child_process');
    var ffmpeg = require('fluent-ffmpeg');
    var {
        Translate
    } = require('@google-cloud/translate').v2;
    var fs = require('fs');
    var util = require('util');
    var textToSpeech = require('@google-cloud/text-to-speech');

    // Creates a client
    var datastore = new Datastore();


    var getLastLanguage = async function (username) {

        // The kind for the new entity
        var kind = 'Babel App Alexa User Language Selection';
        var name = Date.now();

        var query = datastore.createQuery('Babel App Alexa User Language Selection')
            .filter('username', '=', username)
            .order('timestamp', {
                descending: true,
            });

        var [tasks] = await datastore.runQuery(query);

        console.log(tasks);

        if (tasks.length != 0) {
            var target_language = tasks[0].language;
            return target_language;
        } else {
            return null;
        }




    };



    if (req.body.action == "set-language") {

        (async function () {

            var kind = 'Babel App Alexa User Language Selection';
            var name = Date.now();
            var taskKey = datastore.key([kind, name]);

            // Prepares the new entity
            var task = {
                key: taskKey,
                data: {
                    username: req.body.alexa_username,
                    language: req.body.language,
                    timestamp: Date.now()
                },
            };

            // Saves the entity
            await datastore.save(task);
            res.status(200).send('{"Language Changed":true}');

            return false;

        }());


    }

        var runTranslation = async function () {

            /*
Spanish, Thai, Russian, Arabic, Chinese, Hindi

        */

            console.log("target languag");
            var target_language = await getLastLanguage(req.body.alexa_username);

            if(!target_language){
                console.log("prompt user to select language");
                res.status(200).send('{"response":"no language selected"}');
                return false;
            }


            var waveNetLanguageCode = {
                "Afrikaans": ["af"],
                "Albanian": ["sq"],
                "Amharic": ["am"],
                "Arabic": ["ar", "ar-XA"],
                "Armenian": ["hy"],
                "Azerbaijani": ["az"],
                "Basque": ["eu"],
                "Belarusian": ["be"],
                "Bengali": ["bn"],
                "Bosnian": ["bs"],
                "Bulgarian": ["bg"],
                "Catalan": ["ca"],
                "Cebuano": ["ceb"],
                "Chinese": ["zh-TW", "yue-HK"],
                "Corsican": ["co"],
                "Croatian": ["hr"],
                "Czech": ["cs"],
                "Danish": ["da"],
                "Dutch": ["nl"],
                "English": ["en", "en-US"],
                "Esperanto": ["eo"],
                "Estonian": ["et"],
                "Finnish": ["fi"],
                "French": ["fr"],
                "Frisian": ["fy"],
                "Galician": ["gl"],
                "Georgian": ["ka"],
                "German": ["de"],
                "Greek": ["el"],
                "Gujarati": ["gu"],
                "Haitian Creole": ["ht"],
                "Hausa": ["ha"],
                "Hawaiian": ["haw"],
                "Hebrew": ["he"],
                "Hindi": ["hi", "hi-IN"],
                "Hmong": ["hmn"],
                "Hungarian": ["hu"],
                "Icelandic": ["is"],
                "Igbo": ["ig"],
                "Indonesian": ["id"],
                "Irish": ["ga"],
                "Italian": ["it"],
                "Japanese": ["ja"],
                "Javanese": ["jv"],
                "Kannada": ["kn"],
                "Kazakh": ["kk"],
                "Khmer": ["km"],
                "Kinyarwanda": ["rw"],
                "Korean": ["ko"],
                "Kurdish": ["ku"],
                "Kyrgyz": ["ky"],
                "Lao": ["lo"],
                "Latin": ["la"],
                "Latvian": ["lv"],
                "Lithuanian": ["lt"],
                "Luxembourgish": ["lb"],
                "Macedonian": ["mk"],
                "Malagasy": ["mg"],
                "Malay": ["ms"],
                "Malayalam": ["ml"],
                "Maltese": ["mt"],
                "Maori": ["mi"],
                "Marathi": ["mr"],
                "Mongolian": ["mn"],
                "Myanmar (Burmese)": ["my"],
                "Nepali": ["ne"],
                "Norwegian": ["no"],
                "Nyanja": ["ny"],
                "Odia (Oriya)": ["or"],
                "Pashto": ["ps"],
                "Persian": ["fa"],
                "Polish": ["pl"],
                "Portuguese": ["pt"],
                "Punjabi": ["pa"],
                "Romanian": ["ro"],
                "Russian": ["ru", "ru-RU"],
                "Samoan": ["sm"],
                "Scots Gaelic": ["gd"],
                "Serbian": ["sr"],
                "Sesotho": ["st"],
                "Shona": ["sn"],
                "Sindhi": ["sd"],
                "Sinhala (Sinhalese)": ["si"],
                "Slovak": ["sk"],
                "Slovenian": ["sl"],
                "Somali": ["so"],
                "Spanish": ["es", "es-ES"],
                "Sundanese": ["su"],
                "Swahili": ["sw"],
                "Swedish": ["sv"],
                "Tagalog (Filipino)": ["tl"],
                "Tajik": ["tg"],
                "Tamil": ["ta"],
                "Tatar": ["tt"],
                "Telugu": ["te"],
                "Thai": ["th", "th-TH"],
                "Turkish": ["tr"],
                "Turkmen": ["tk"],
                "Ukrainian": ["uk"],
                "Urdu": ["ur"],
                "Uyghur": ["ug"],
                "Uzbek": ["uz"],
                "Vietnamese": ["vi"],
                "Welsh": ["cy"],
                "Xhosa": ["xh"],
                "Yiddish": ["yi"],
                "Yoruba": ["yo"],
                "Zulu": ["zu"]
            };

            // Creates a client
            var translate = new Translate();
            var text = req.body.text;
            var target = waveNetLanguageCode[target_language][0];
            var gender = req.body.gender.toUpperCase();

            console.log(text, target);

            // Translates the text into the target language. "text" can be a string for
            // translating a single piece of text, or an array of strings for translating
            // multiple texts.
            let [translations] = await translate.translate(text, target);
            translations = Array.isArray(translations) ? translations : [translations];
            console.log('Translations:');
            console.log(translations);


            // Creates a client
            var client = new textToSpeech.TextToSpeechClient();

            // varruct the request
            var request1 = {
                input: {
                    text: translations[0]
                },
                // Select the language and SSML voice gender (optional)
                voice: {
                    languageCode: waveNetLanguageCode[target_language][1],
                    ssmlGender: gender
                },
                // select the type of audio encoding
                audioConfig: {
                    audioEncoding: 'MP3',
                    sample_rate_hertz: 16000
                },
            };

            // Performs the text-to-speech request
            var [response] = await client.synthesizeSpeech(request1);

            // Write the binary audio content to a local file
            var fileName = Date.now() + '.mp3';

            var localLocation = '/Users/tmoody/Macgyver/babel-app-testing-kit/cloud-function/tmp/';

            if (!fs.existsSync('/Users/tmoody/Macgyver/babel-app-testing-kit/cloud-function/tmp/')) {
                console.log("run in gcloud");
                localLocation = '/tmp/';
            }

            console.log(localLocation + fileName);

            var writeFile = util.promisify(fs.writeFileSync);
            writeFile(localLocation + fileName, response.audioContent, 'binary');

            console.log("mp3 file written");

            var command = ffmpeg();

            ffmpeg(localLocation + fileName)
                .audioBitrate(48)
               .audioFrequency(16000)
               .audioFilters('volume=3')
               .audioCodec('libmp3lame')
                .on('error', function (err) {
                    console.log('An error occurred: ' + err.message);
                })
                .on('end', function () {
                    console.log('Processing finished !');

                    var storage = new Storage();

                    var bucket = storage.bucket('alexa-translation');


                    bucket.upload(localLocation + "temp-" + fileName, function (err, file, apiResponse) {

                        console.log(err);

                        console.log("file uploaded");

                        var payload = {
                            "audio_url": "https://storage.googleapis.com/alexa-translation/" + "temp-" + fileName
                        };

                        res.status(200).send(JSON.stringify(payload));

                        fs.unlinkSync(localLocation + fileName);
                        fs.unlinkSync(localLocation + "temp-" + fileName);

                    });





                    console.log('Audio content written to file: output.mp3');









                })
                .save(localLocation + "temp-" + fileName, function (error) {

                    console.log(error);


                });




            // The kind for the new entity
            kind = 'Babel App Queries';

            // The name/ID for the new entity
            var name = Date.now();

            // The Cloud Datastore key for the new entity
            var taskKey = datastore.key([kind, name]);

            // Prepares the new entity
            var task = {
                key: taskKey,
                data: {
                    username: req.body.alexa_username,
                    target_language: waveNetLanguageCode[target_language][0],
                    text: req.body.text,
                    timestamp: Date.now()
                },
            };

            // Saves the entity
            await datastore.save(task);
            console.log(`Saved ${task.key}: ${task.data.username}`);


            var query = datastore.createQuery('Babel App Queries').order('created');
            var [tasks] = await datastore.runQuery(query);

            console.log('Tasks:' + tasks);



            // convert file



        }




        var username = 'test-script';

        console.log("Username: " + username);


        var query = datastore.createQuery('Babel App Premium Users')
            .filter('username', '=', username);

        var [isFreeUser] = await datastore.runQuery(query);

        // if Free User then count queries
        if (!(!!isFreeUser.length)) {

            console.log("Free User");

            var now = new Date();
            var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

            var query = datastore.createQuery('Babel App Queries')
                .filter('username', '=', 'test-script');

            var [freeQueries] = await datastore.runQuery(query);

            var freeQueriesFiltered = freeQueries.filter(function (data) {
                return data.timestamp > startOfDay;
            });

            if (freeQueriesFiltered.length > 5) {

                console.log("user exceeded limit");
                // suggest upgrading

                res.status(200).send(JSON.stringify({
                    error: "Quota exceeded."
                }));
            } else {



                // Execute Translation
                console.log("free user");
                runTranslation();




            }

        } else {


            console.log("premium user");
            runTranslation();


        }


    

};