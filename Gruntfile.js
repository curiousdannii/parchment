module.exports = function( grunt )
{
	"use strict";
	
	grunt.initConfig({
	
		concat: {
			options: {
				process: true,
			},
		},
		
		jshint: {
			options: {
				// Enforcing options
				curly: true, // Require brackets for all blocks
				latedef: true, // require all vars to be defined before being used
				newcap: true, // require classes to begin with a capital
				strict: true, // ES5 strict mode
				undef: true, // all vars must be defined
				unused: true, // warn for unused vars
				
				// Relaxing options
				"-W041": false, // Use '===' to compare with '0'
				"-W064": false, // Don't warn about missing new with ByteArray
				"-W065": false, // Missing radix parameter in parseInt
				boss: true, // Allow assignments in if, return etc
				evil: true, // eval() :)
				funcscope: true, // don't complain about using variables defined inside if statements
				
				// Environment
				browser: true,
				nonstandard: true,
				predef: [],
			},
			parchment: [ '.build/*.js' ],
			grunt: {
				options: {
					node: true,
					"-W070": false,
				},
				files: {
					src: [ 'Gruntfile.js' ],
				},
			},
		},
		
		uglify: {
			options: {
				compress: {
					global_defs: {
						DEBUG: false,
					},
				},
				preserveComments: function( node, token ) { return (/Built/).test( token.value ); },
				report: 'min',
			},
			zvm: {
				options: {
					compress: {
						global_defs: {
							DEBUG: false,
							ZVM: true,
							GVM: false,
						},
					},
				},
				files: {
					'lib/zvm.min.js': [ 'src/ifvms.js/dist/zvm.js' ],
				}
			},
		},
	});

	grunt.loadNpmTasks( 'grunt-contrib-concat' );
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-contrib-uglify' );
	grunt.loadNpmTasks( 'grunt-update-submodules' );

	grunt.registerTask( 'default', [ 'update_submodules', 'concat', 'jshint', 'uglify' ] );
};