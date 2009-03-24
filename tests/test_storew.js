load("remedial.js");
load("error-handling.js");
load("gnusto-engine.js");

function step() {
    var retval = 0;

    engine.run();
    var effect = engine.effect(0);
    var text = engine.consoleText();

    effect = '"' + effect + '"';

    switch (effect) {
    case GNUSTO_EFFECT_QUIT:
        retval = 1;
        break;
    default:
        break;
    };

    if (text)
        print(text);

    return retval;
}

var engine = new GnustoEngine();

var f = new java.io.File("tests/test_storew.z5");
var fis = new java.io.FileInputStream(f);
var dis = new java.io.DataInputStream(fis);

var bytes = new Array(f.length());
for (var i = 0; i < bytes.length; i++)
  bytes[i] = dis.readUnsignedByte();

engine.loadStory(bytes);

while (step() == 0) {}
