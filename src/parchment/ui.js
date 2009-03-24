new function(_)
{
	// The Parchment User Interface
	var ui = new base2.Package(this, {
		name: 'ui',
		exports: 'splash'
	});

	eval(this.imports);

	// Display a splash screen with cover art and intro
	var splash = base2.Base.extend({
		constructor: function create_splash(story)
		{
			this.story = story;
		}
	});

	eval(this.exports);
};
