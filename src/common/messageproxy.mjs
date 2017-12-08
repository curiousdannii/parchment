/*

Message proxy
=============

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

const slice = Array.prototype.slice

export default class MessageProxy
{
    constructor( postmessage, name, simplefuncs, advancedfuncs = {} )
    {
        for ( let func of simplefuncs )
        {
            this[func] = function()
            {
                postmessage({
                    code: name,
                    func: func,
                    args: slice.apply( arguments ),
                })
            }
        }
        for ( let func in advancedfuncs )
        {
            this[func] = advancedfuncs[func]
        }
    }
}