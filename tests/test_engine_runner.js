load("remedial.js");
load("error-handling.js");
load("gnusto-engine.js");
load("engine-runner.js");

function FakeEngine() {
    this._step = 0;
    this.m_memory = new Array(5000);
    var self = this;

    this.__proto__ = {
        m_version: 5,

        run: function() {
            self._step += 1;
        },

        effect: function(which) {
            var effects = [
                [GNUSTO_EFFECT_INPUT],
                [GNUSTO_EFFECT_STYLE, 0, 0, 0],
                [GNUSTO_EFFECT_INPUT],
                [GNUSTO_EFFECT_QUIT]
            ];

            var effect = effects[self._step-1][which];

            if (which == 0)
                effect = effect.slice(1, -1);

            return effect;
        },

        answer: function(number, response) {
            print("engine.answer() received: "+number+", "+response);
        },

        consoleText: function() {
            switch (self._step) {
            case 2:
                return "Hai2u!";
                break;
            default:
                return "";
            }
        }
    };
}

function TestZui() {
    this._inputCount = 0;
    var self = this;

    this.__proto__ = {
        setVersion: function(version) {
            print("z-machine version: " + version);
        },

        getSize: function() {
            return [60, 255];
        },

        onQuit: function() {
            print("onQuit() received");
        },

        onLineInput: function(callback) {
            var responses = ["hello", "hello again"];
            var response = responses[self._inputCount];

            print("onLineInput() received");
            if (self._inputCount == 0) {
                print("  responding immediately with: "+response);
                callback(response);
            } else {
                print("  queuing delayed response: "+response);
                gDelayedCallQueue.push(function() { callback(response); });
            }
            self._inputCount += 1;
        },

        onPrint: function(text) {
            print("onPrint() received: "+text);
        },

        onSetStyle: function(textStyle, foreground, background) {
            print("onSetStyle() received: style:" + textStyle +
                  " fg:" + foreground + " bg:" + background);
        }
    };
};

var gZui = new TestZui();
var gRunner = new EngineRunner(new FakeEngine(),
                               gZui,
                               function() {});
var gDelayedCallQueue = [];

gRunner.run();

while (gDelayedCallQueue.length) {
    print("Calling delayed call");
    gDelayedCallQueue.pop()();
}
