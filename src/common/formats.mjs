/*

File formats and VM settings
============================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import * as file from './file.mjs'
import MemoryView from './memoryview.mjs'

// This formats array is similar but not identical to Lectrote's

export const formats = [

    {
        id: 'blorb',
        name: 'Blorb',
        extensions: ['blorb', 'blb'],
        identify: view => view.getFourCC( 0 ) === 'FORM' && view.getFourCC( 8 ) === 'IFRS',
    },

    {
        id: 'glulx',
        name: 'Glulx',
        blorbType: 'GLUL',
        extensions: ['gblorb', 'glb', 'ulx'],
        identify: view => view.getFourCC( 0 ) === 'Glul',
    },

]

export const formatsByBlorbType = {}
export const formatsById = {}
for ( let format of formats )
{
    formatsById[ format.id ] = format
    if ( format.blorbType )
    {
        formatsByBlorbType[ format.blorbType ] = format
    }
}

export async function identify( buffer )
{
    const headerView = MemoryView( buffer, 0, 64 )

    // Test for Blorb first
    if ( formatsById.blorb.identify( headerView ) )
    {
        const blorb = new file.Blorb( buffer )
        if ( formatsByBlorbType[ blorb.exec.type ] )
        {
            return {
                blorb: buffer,
                data: blorb.exec.data,
                format: formatsByBlorbType[ blorb.exec.type ],
            }
        }
        else
        {
            return null
        }
    }

    const possibleFormats = formats.filter( format => format.identify( headerView ) )
    return {
        data: new Uint8Array( buffer ),
        format: possibleFormats[0],
    }
}