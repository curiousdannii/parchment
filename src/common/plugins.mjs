/*

Promisify plugins and other functions
=====================================

Copyright (c) 2018 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import pify from 'pify'

export const deviceready = () => new Promise( ( resolve, reject ) => {
    document.addEventListener( 'deviceready', () => { resolve() }, false )
})

export const getIntent = pify( callback => {
    window.plugins.intentShim.getIntent( intent => callback( null, intent ), err => callback ( err ) )
})

export const httpd = {}

export const startHttpd = pify( callback => {
    cordova.plugins.CorHttpd.startServer( {}, url => callback( null, httpd.url = url ), err => callback ( err ) )
})