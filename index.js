function processData(data) {
  for (var i = 0; i < data.length; i++) {
    document.write('<div><a href="parchment.html?story=' + data[i].path +
                   '">' + data[i].desc + '</a></div>');
  }
}

$(document).ready(function() {
  $.getJSON("if-archive.json", processData);
});
