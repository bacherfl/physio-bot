var restify = require('restify');
var builder = require('botbuilder');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: "81f37a66-0109-4519-9739-cf9daa4642dd",
    appPassword: "nSPUDxo2Gp7Vvip5nANfOnO"
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', [
    function (session, args, next) {
        session.send("Hi!");
        session.send("I can help you to identify Injuries you might have gotten during your workout");
        session.beginDialog("/assessInjury");
    },
    function (session, results) {
        session.send('Hello %s!', session.userData.name);
        session.beginDialog("/assessInjury");
    }
]);

bot.dialog('/profile', [
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.beginDialog("/assessInjury");
    }
]);

bot.dialog('/assessInjury', [
    function (session) {
        session.send("What kind of injury do you have?");
        var msg = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachments([
                new builder.ThumbnailCard(session)
                    //.title("What kind of injury do you have?")
                    .buttons([
                        builder.CardAction.imBack(session, "shoulder", "Shoulder"),
                        builder.CardAction.imBack(session, "other", "Other")
                    ])
            ]);

        builder.Prompts.choice(session, msg, "shoulder|other");
    },
    function (session, result) {
        console.log(result);
        if ("shoulder" === result.response.entity) {
            session.send("Let's go through a checklist to assess your injury.");
            session.beginDialog("/assessLateralShoulder");
        } else {
            session.endConversation("Sorry, i can't help you with that yet :-(");
        }
    }
]);

bot.dialog('/assessLateralShoulder', buildYesNoQuestionConfig(
    "Do you have pain in your shoulder when you move your arm out to the side as high as you can?",
    function yesCallback(session) {
        session.beginDialog("/assessRepeatedLifting");
    },
    function noCallback(session) {
        session.beginDialog("/assessImpingement");
    }
));

bot.dialog('/assessRepeatedLifting', buildYesNoQuestionConfig(
    "Does your shoulder pain increase as you lift your arm repeatedly?",
    function yesCallback(session) {
        sendShoulderTendinitisInfo(session);
    },
    function noCallback(session) {
        session.endConversation("It's a good chance it's a Rotator Cuff Tear");
    })
);

bot.dialog('/assessImpingement', buildYesNoQuestionConfig(
    "When you lift your arm to the side or perform a shoulder impingement test, do you feel a pinching?",
    function yesCallback(session) {
        session.endConversation("It's a good chance you have a Shoulder Subluxation");
    },
    function noCallback(session) {
        session.beginDialog('/assessFlexibility');
    })
);

bot.dialog('/assessFlexibility', buildYesNoQuestionConfig(
    "Your shoulder joint gives way easy and you're very flexible in your shoulders",
    function yesCallback(session) {
        session.endConversation("It's a good chance you have a Shoulder Subluxation");
    },
    function noCallback(session) {
        session.endConversation("Redo the assessment, or maybe it's a problem I can't identify yet");
    }
))

//=============================================

function buildOptionsMessage(session, options) {
    var buttonObjects = [];
    for (var i = 0; i < options.length; i++) {
        buttonObjects.push(builder.CardAction.imBack(session, options[i].value, options[i].displayText));
    }

    var msg = new builder.Message(session)
        .textFormat(builder.TextFormat.xml)
        .attachments([
            new builder.ThumbnailCard(session)
                .buttons(buttonObjects)
        ]);

    return msg;
}

function buildYesNoMessage(session) {
    return buildOptionsMessage([
        {
            value: "yes",
            displayText: "Yes"
        },
        {
            value: "no",
            displayText: "No"
        }
    ]);
}

function buildYesNoQuestionConfig(questionText, yesCallback, noCallback) {
    console.log("Building YesNo Question config")
    return [
        function (session) {
            var msg = new builder.Message(session)
                .textFormat(builder.TextFormat.xml)
                .attachments([
                    new builder.ThumbnailCard(session)
                        .buttons([
                            builder.CardAction.imBack(session, "yes", "Yes"),
                            builder.CardAction.imBack(session, "no", "No")
                        ])
                ]);
            session.send(questionText);
            builder.Prompts.choice(session, msg, "yes|no");
        },
        function (session, result) {
            console.log(result);
            if ("yes" === result.response.entity) {
                yesCallback(session);
            } else {
                noCallback(session);
            }
        }
    ]
}

function sendShoulderTendinitisInfo(session) {
    session.send("It's a good chance it's Shoulder Tendonitis");
    //http://physioworks.com.au/Injuries-Conditions/Regions/rotator-cuff-tendonitis.png.jpg
    var msg = new builder.Message(session)
        .textFormat(builder.TextFormat.xml)
        .attachments([
            new builder.HeroCard(session)
                .title("Shoulder Tendonitis")
                .subtitle("")
                .text("")
                .images([
                    builder.CardImage.create(session, "http://physioworks.com.au/Injuries-Conditions/Regions/rotator-cuff-tendonitis.png.jpg")
                ])               
            ]);
            
    session.send(msg);
    session.endConversation("Stop ego lifting, you moron!");

}
