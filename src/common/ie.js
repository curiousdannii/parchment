// Show an error in Internet Explorer

function show_error()
{
    $('#errorcontent').text('Sorry, but Parchment depends on web features unsupported by this browser. Please try a more modern browser.')
    $('#errorpane').show()
}

$(show_error)