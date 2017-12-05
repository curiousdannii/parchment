/*

Promisify plugins and other functions
=====================================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import pify from 'pify'

const promplugins = {}

const deviceready_promise = new Promise( ( resolve, reject ) => {

    document.addEventListener( 'deviceready', () => { resolve() }, false )

})

const promisify = deviceready_promise.then( () => {

    promplugins.getIntent = pify( callback => {
        plugins.intent.getCordovaIntent( intent => callback( null, intent ), err => callback ( err ) )
    })

    /*promplugins.getRealPath = pify( ( contenturl, callback ) => {
        plugins.intent.getRealPathFromContentUrl( contenturl, path => callback( null, path ), err => callback ( err ) )
    })*/

    promplugins.resolveNativePath = pify( ( contenturl, callback ) => {
        FilePath.resolveNativePath( contenturl, path => callback( null, path ), err => callback ( err ) )
    })

    return promplugins
})

export { promisify, promplugins }