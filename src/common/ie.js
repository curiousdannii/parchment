// Show an error in Internet Explorer

function show_error()
{
    $('#errorcontent').text('Sorry, but Parchment does not support Intenet Explorer. Please use a more modern browser.')
    $('#errorpane').show()
}

$(show_error)