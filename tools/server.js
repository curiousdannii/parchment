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

var port = process.env.PORT || 3000;
app.listen( port );
console.log( 'Parchment server started on port: ' + port );