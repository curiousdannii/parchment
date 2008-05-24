load("base64.js", "troll.js", "gnusto-engine.min.js");

var gInputTimes = 0;

function step() {
    var retval = 0;

    engine.run();
    var effect = engine.effect(0);
    var text = engine.consoleText();
    var desc = '['+effect+']';

    effect = '"' + effect + '"';

    switch (effect) {
    case GNUSTO_EFFECT_INPUT:
        var responses = ['quit', 'yes'];
        var response = responses[gInputTimes];
        desc = '[GNUSTO_EFFECT_INPUT]';
        desc += ' (responding with "' + response + '")';
        engine.answer(1, response);
        gInputTimes += 1;
        break;
    case GNUSTO_EFFECT_SETWINDOW:
        desc = ('[GNUSTO_EFFECT_SETWINDOW ' + engine.effect(1) + ']');
        break;
    case GNUSTO_EFFECT_SPLITWINDOW:
        desc = ('[GNUSTO_EFFECT_SPLITWINDOW ' + engine.effect(1) + ']');
        break;
    case GNUSTO_EFFECT_SETCURSOR:
        desc = ('[GNUSTO_EFFECT_SETCURSOR ' + engine.effect(1) + ' ' +
                engine.effect(2) + ']');
        break;
    case GNUSTO_EFFECT_STYLE:
        desc = ('[GNUSTO_EFFECT_STYLE ' + engine.effect(1) +
                ' ' + engine.effect(2) + ' ' + engine.effect(3) + ']');
        break;
    case GNUSTO_EFFECT_QUIT:
        desc = '[GNUSTO_EFFECT_QUIT]';
        retval = 1;
        break;
    default:
        break;
    };

    print(desc);
    if (text)
        print(text);

    return retval;
}

var engine = new GnustoEngine();

engine.loadStory(troll_z5);

while (step() == 0) {}
