/*

Parchment server
================

Copyright (c) 2013 The Parchment Contributors
BSD licenced
https://github.com/curiousdannii/parchment

*/

var express = require( 'express' );
var app = express();

app.use( express.compress() );
app.use( express.static( __dirname + '/../' ) );

app.listen( process.env.PORT || 3000 );