function processData(stories) {
  for (var i = 0; i < stories.length; i++) {
    $("#content").append(
      '<div class="story"><a href="parchment.html?story=' +
      stories[i].path +
      '">' + stories[i].desc.entityify() + '</a></div>'
    );
  }
}

$(document).ready(function() {
  processData(stories);
});
