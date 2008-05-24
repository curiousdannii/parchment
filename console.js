function Console(width, height, element, observer) {
  this.width = width;
  this.height = height;
  this._element = element;
  this._pos = [0, 0];
  this._observer = observer;
  this.clear();
}

Console.prototype = {
  resize: function(height) {
    var linesAdded = height - this.height;

    if (linesAdded == 0)
      return;

    var y;

    if (linesAdded > 0)
      for (y = 0; y < linesAdded; y++)
        this._addRow();
    else
      for (y = 0; y < -linesAdded; y++)
        this._delRow();
    this.height = height;
    this.render();
  },

  _delRow: function() {
    this._characters.pop();
    this._styles.pop();
  },

  _addRow: function() {
    var charRow = [];
    var styleRow = [];
    for (var x = 0; x < this.width; x++) {
      charRow.push("&nbsp;");
      styleRow.push(null);
    }
    this._characters.push(charRow);
    this._styles.push(styleRow);
  },

  clear: function() {
    this._characters = [];
    this._styles = [];
    for (var y = 0; y < this.height; y++)
      this._addRow();
    this.render();
  },

  moveTo: function(x, y) {
    this._pos = [x, y];
  },

  write: function(string, style) {
    var x = this._pos[0];
    var y = this._pos[1];
    for (var i = 0; i < string.length; i++) {
      var character = null;

      if (string[i] == " ")
        character = "&nbsp;";
      else if (string[i] == "\n") {
        x = 0;
        y += 1;
      } else
        character = string[i].entityify();

      if (character != null) {
        this._characters[y][x] = character;
        this._styles[y][x] = style;
        x += 1;
      }
    }
    this._pos = [x, y];
    this.render();
  },

  render: function() {
    var string = "";
    for (var y = 0; y < this.height; y++) {
      var currStyle = null;
      for (var x = 0; x < this.width; x++) {
        if (this._styles[y][x] !== currStyle) {
          if (currStyle !== null)
            string += "</span>";
          currStyle = this._styles[y][x];
          if (currStyle !== null)
            string += '<span class="' + currStyle + '">';
        }
        string += this._characters[y][x];
      }
      if (currStyle !== null)
        string += "</span>";
      string += "<br/>";
    }
    this._element.innerHTML = string;
    this._observer.onConsoleRender();
  },

  close: function() {
    this._element.innerHTML = "";
    this._observer.onConsoleRender();
  }
}
