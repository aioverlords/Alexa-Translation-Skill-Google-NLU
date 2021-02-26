const Alexa = require('ask-sdk-core');
const https = require('https');

var options = "";

var openEndedResponse = "I'm listening if you want to run another translation. To exit just say stop."

async function upgradeUser(user) {
    console.log("upgrading user");
    options = {
        "action": "upgrade-user",
        "alexa_username": user
    };
    var resURL = await httpGet(options);
    console.log(resURL);
}


function httpGet(data) {

    var dataOptions = data;

    return new Promise(function (resolve, reject) {

        var payload = JSON.stringify(dataOptions);

        console.log("Alexa Request Payload:");
        console.log(payload);

        var options = {
            host: 'us-central1-macgyver-services-production.cloudfunctions.net',
            port: 443,
            path: '/NLU_TRANSLATION',
            method: 'POST',
            timeout: 7200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length
            }
        };

        var resObj = {
            type: "",
            message: ""
        };

        var req = https.request(options, res => {
            res.setEncoding('utf8');
            var responseString = "";


            res.on('data', chunk => {
                responseString = responseString + chunk;
            });

            res.on('end', () => {
                console.log(`Cloud Function Response: ${responseString}`);

                if (/exceed/gi.test(responseString)) {
                    resObj.message = responseString;
                    resObj.type = "quota-limit";
                    resolve(resObj);
                } else if (/error/gi.test(responseString)) {
                    resObj.type = "error";
                    resObj.message = "Hmmm, it looks like the translation service is not responding. Please try again later.";
                    resolve(resObj);
                } else if (/no.language/gi.test(responseString)) {
                    resObj.type = "error";
                    resObj.message = "No language selected.";
                    resolve(resObj);
                } else {
                    resObj.type = "success";
                    resObj.message = JSON.parse(responseString).audio_url;
                    resolve(resObj);
                }
            });
        });

        req.on('error', function (e) {
            console.log('problem with request: ' + e.message);
            resolve(resObj);
        });

        req.on('timeout', () => {
            resObj.type = "timeout";
            resObj.message = "Hmmm, I had trouble with that translation. Please try again.";
            console.log("Cloud Function Has TIMED OUT / Request ABORTED");
            req.abort();
            resolve(resObj);
        });

        req.write(payload);
        req.end();
    });
}



const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {

        console.log(handlerInput.requestEnvelope);

        const speakOutput = "Hello, welcome to my interpreter. To run a translation. Just say, translate followed by the word or phrase you want to translate. To select a target language just say, change language to Spanish.";
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};


const BuyResponseHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'Connections.Response' &&
            /buy|upsell|cancel/gi.test(handlerInput.requestEnvelope.request.name);
    },
    async handle(handlerInput) {



        console.log(handlerInput.requestEnvelope.request.name); 
        console.log(handlerInput.requestEnvelope.request.payload.purchaseResult);
        console.log("Buy Response Handler");


        var userID = handlerInput.requestEnvelope.session.user.userId.match(/[^\.]+/gi)[3];
        // userID = "test-script";

        if (/accept/gi.test(handlerInput.requestEnvelope.request.payload.purchaseResult) && /buy/gi.test(handlerInput.requestEnvelope.request.name)) {

            console.log("Successful purchase");

            await upgradeUser(userID);

            return handlerInput.responseBuilder
                .speak("You have successfully upgraded to Unlimited Translations. Feel free to run a new translation.")
                .reprompt("You have successfully upgraded to Unlimited Translations. Feel free to run a new translation.")
                .getResponse();

        } else if (/already/gi.test(handlerInput.requestEnvelope.request.payload.purchaseResult)) {

            await upgradeUser(userID);

            return handlerInput.responseBuilder
                .speak(`You already have unlimited Translations. ${openEndedResponse}`)
                .reprompt(`You already have unlimited Translations. ${openEndedResponse}`)
                .getResponse();

        } else if (/cancel/gi.test(handlerInput.requestEnvelope.request.name)) {

            return handlerInput.responseBuilder
                .speak(openEndedResponse)
                .reprompt(openEndedResponse)
                .getResponse();


        } else {

            return handlerInput.responseBuilder
                .speak("You will not be upgraded to Unlimited Translations. If you change your mind and want to upgrade just say Purchase Unlimited Translations.")
                .reprompt("You will not be upgraded to Unlimited Translations. If you change your mind and want to upgrade just say Purchase Unlimited Translations.")
                .getResponse();

        }

    }
};



const SelectLanguageIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'select_language';
    },
    async handle(handlerInput) {

        console.log(JSON.stringify(handlerInput.requestEnvelope));

        var speakOutput = "Sorry I was unable to change the language, please try again.";
        var target_language = handlerInput.requestEnvelope.request.intent.slots.language.value;
        var userID = handlerInput.requestEnvelope.session.user.userId.match(/[^\.]+/gi)[3];
        // userID = "test-script";

        options = {
            "action": "set-language",
            "target_language": target_language,
            "alexa_username": userID
        };

        var resURL = await httpGet(options);

        speakOutput = `Language is now set to ${handlerInput.requestEnvelope.request.intent.slots.language.value}. ${openEndedResponse}`;

        console.log(speakOutput);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(openEndedResponse)
            .getResponse();

    }
};



const TranslateIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'translate';
    },
    async handle(handlerInput) {

        console.log(JSON.stringify(handlerInput));

        var userID = handlerInput.requestEnvelope.session.user.userId.match(/[^\.]+/gi)[3];
        // userID = "test-script";
        console.log(`User ID: ${userID}`);
        
        console.log(handlerInput.requestEnvelope.request.intent.slots);

        var text = handlerInput.requestEnvelope.request.intent.slots.text.value;
        console.log(`Translation Text: ${text}`);

        options = {
            "action": "translate",
            "text": text,
            "gender": "NEUTRAL",
            "alexa_username": userID
        };

        var cloudFunctionResponse = await httpGet(options);

        console.log("--------");
        console.log(cloudFunctionResponse);
        console.log(cloudFunctionResponse.type);

        var speakOutput = "";

        if (cloudFunctionResponse.type === "quota-limit") {

            speakOutput = "Sorry, you have exceeded the maximum limit of 5 Translations per day. To upgrade to unlimited Translations just say, purchase Unlimited Translations.";
        } else if (/no.language/gi.test(cloudFunctionResponse.message)) {

            speakOutput = "First, you need to select a target language. To change the language to Spanish, just say Change language to Spanish.";

        } else if (cloudFunctionResponse.type === "timeout") {

            console.log("TIMEOUT CODE RAN");
            speakOutput = "Hmm, I had trouble with that translation. Please try again.";

        } else if (cloudFunctionResponse.type === "error") {

            console.log("Server Error.");
            speakOutput = cloudFunctionResponse.message;

        } else if (cloudFunctionResponse.type == "success") {

            console.log(cloudFunctionResponse.message);

            speakOutput = `<audio src="${cloudFunctionResponse.message}" /><break time="1s"/> ${openEndedResponse}`;
        }


        console.log(speakOutput);

        console.log("|||||response handler|||||");
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt("To run another translation say translate followed by the word or phrase you want to translate.")
            .getResponse();

    }
};




const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};




const ListLanguagesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'ListLanguagesIntent';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `This application supports translation for the following languages. arabic, hindi, italian, french, german, japanese, chinese, portuguese, russian, thai, and spanish. To run a translation. Just say, translate followed by the word or phrase you want to translate.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(openEndedResponse)
            .getResponse();
    }
};




const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'Help';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `Hello, welcome to my interpreter. To run a translation. Just say, 
        translate followed by the word or phrase you want to translate. To select a target language just say, change language to Spanish. 
        You will be allowed to make five translations each day. To upgrade to unlimited translations, just say purchase unlimited Translations.`;


        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};




const WhatCanIBuyIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'WhatCanIBuyIntent';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You can purchase my interpreter premium with unlimited Translations. Just say, purchase Unlimited Translations.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};


const BuyIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'BuyIntent';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        //  const speakOutput = `You have successfully purchased Unlimited Translations.`;

        return handlerInput.responseBuilder
            .addDirective({
                type: "Connections.SendRequest",
                name: "Buy",
                payload: {
                    InSkillProduct: {
                        productId: "amzn1.adg.product.841ec3fd-bbf2-49ba-898c-3757f2172080",
                    }
                },
                token: "correlationToken"
            })
            //.speak(speakOutput)
            .getResponse();
    }
};



const CancelPurchaseIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'CancelPurchaseIntent';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        
        console.log("cancel purchase intent");

        return handlerInput.responseBuilder
            .addDirective({
                type: 'Connections.SendRequest',
                name: 'Cancel',
                payload: {
                    InSkillProduct: {
                        productId: "amzn1.adg.product.841ec3fd-bbf2-49ba-898c-3757f2172080",
                    }
                },
                token: "correlationToken"
            })
            .getResponse();

    }
};


const SessionEndedHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest' ||
            (handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent') ||
            (handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent');
    },
    handle(handlerInput) {
        console.log('IN: SessionEndedHandler.handle');
        console.log(handlerInput);

        return handlerInput.responseBuilder
            .speak("Goodbye")
            .getResponse();
    },
};





// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle(handlerInput) {
        console.log(handlerInput.requestEnvelope.request);
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};



exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelpIntentHandler,
        TranslateIntentHandler,
        WhatCanIBuyIntentHandler,
        BuyIntentHandler,
        CancelPurchaseIntentHandler,
        BuyResponseHandler,
        SelectLanguageIntentHandler,
        SessionEndedHandler,
        ListLanguagesIntentHandler,
        CancelAndStopIntentHandler
    )
    .withApiClient(new Alexa.DefaultApiClient())
    .addErrorHandlers(
        ErrorHandler,
    )
    .lambda();