/*
function Zui() {
}

Zui.prototype = {
  setVersion: function(version) {
  },

  // Returns a 2-element list containing the width and height of the
  // screen, in characters.  The width may be 255, which means
  // "infinite".

  getSize: function() {
  },
  onLineInput: function(callback) {
  },
  onCharacterInput: function(callback) {
  },
  onSave: function(data) {
  },
  onRestore: function() {
  },
  onQuit: function() {
  },
  onRestart: function() {
  },
  onWimpOut: function(callback) {
  },
  onBreakpoint: function(callback) {
  },
  onFlagsChanged: function(isToTranscript, isFixedWidth) {
  },

  // From the Z-Machine spec for set_text_style: Sets the text style
  // to: Roman (if 0), Reverse Video (if 1), Bold (if 2), Italic (4),
  // Fixed Pitch (8). In some interpreters (though this is not
  // required) a combination of styles is possible (such as reverse
  // video and bold). In these, changing to Roman should turn off all
  // the other styles currently set.

  // From section 8.3.1 of the Z-Spec:
  // -1 =  the colour of the pixel under the cursor (if any)
  // 0  =  the current setting of this colour
  // 1  =  the default setting of this colour
  // 2  =  black   3 = red       4 = green    5 = yellow
  // 6  =  blue    7 = magenta   8 = cyan     9 = white
  // 10 =  darkish grey (MSDOS interpreter number)
  // 10 =  light grey   (Amiga interpreter number)
  // 11 =  medium grey  (ditto)
  // 12 =  dark grey    (ditto)
  // Colours 10, 11, 12 and -1 are available only in Version 6.

  onSetStyle: function(textStyle, foreground, background) {
  },

  // From the Z-Machine spec for split_window: Splits the screen so
  // that the upper window has the given number of lines: or, if
  // this is zero, unsplits the screen again.

  onSplitWindow: function(numLines) {
  },
  onSetWindow: function(window) {
  },

  // From the Z-Machine spec for erase_window: Erases window with
  // given number (to background colour); or if -1 it unsplits the
  // screen and clears the lot; or if -2 it clears the screen
  // without unsplitting it.

  onEraseWindow: function(window) {
  },
  onEraseLine: function() {
  },
  onSetCursor: function(x, y) {
  },

  // From the Z-Machine spec for buffer_mode: If set to 1, text output
  // on the lower window in stream 1 is buffered up so that it can be
  // word-wrapped properly. If set to 0, it isn't.

  onSetBufferMode: function(flag) {
  },
  onSetInputStream: function() {
  },
  onGetCursor: function() {
  },
  onPrint: function(output) {
  },
  onPrintTable: function(lines) {
  }
};
*/

function EngineRunner(engine, zui, logfunc) {
  this._engine = engine;
  this._zui = zui;
  this._isRunning = false;
  this._isInLoop = false;
  this._isWaitingForCallback = false;
  this._log = logfunc;

  var self = this;

  var methods = {
    stop: function() {
      self._isRunning = false;
      self._zui._removeBufferedWindows();
    },

    run: function() {
      var size = self._zui.getSize();
      self._zui.setVersion(self._engine.m_version);

      self._isRunning = true;
      self._engine.m_memory[0x20] = size[1];
      self._engine.m_memory[0x21] = size[0];
      this._engine.setWord(size[0], 0x22); // screen width in 'units'
      this._engine.setWord(size[1], 0x24);
      self._continueRunning();
    },

    _continueRunning: function() {
      while (self._isRunning && !self._isWaitingForCallback) {
        self._loop();
      }
    },

    _receiveLineInput: function(input) {
      self._isWaitingForCallback = false;

      // For now we'll say that a carriage return is the
      // terminating character, because we don't actually support
      // other terminating characters.
      self._engine.answer(0, 13);

      self._engine.answer(1, input);
      self._zui._removeBufferedWindows();
      if (!self._isInLoop) {
        self._continueRunning();
      } else {
        /* We're still inside _loop(), so just return. */
      }
    },

    _receiveCharacterInput: function(input) {
      self._isWaitingForCallback = false;
      self._engine.answer(0, input);
      self._zui._removeBufferedWindows();
      if (!self._isInLoop) {
        self._continueRunning();
      } else {
        /* We're still inside _loop(), so just return. */
      }
    },

    _unWimpOut: function() {
      self._isWaitingForCallback = false;
      if (!self._isInLoop) {
        self._continueRunning();
      } else {
        /* We're still inside _loop(), so just return. */
      }
    },

    _loop: function() {
      if (self._isInLoop)
        throw new FatalError("Already in loop!");

      self._isInLoop = true;
      var engine = self._engine;

      engine.run();

      var text = engine.consoleText();
      if (text)
        self._zui.onPrint(text);

      var effect = '"' + engine.effect(0) + '"';

      var logString = "[ " + engine.effect(0);

      for (var i = 1; engine.effect(i) != undefined; i++) {
        var value = engine.effect(i);
        if (typeof value == "string")
          value = value.quote();
        logString += ", " + value;
      }

      self._log(logString + " ]");

      switch (effect) {
      case GNUSTO_EFFECT_INPUT:
        self._isWaitingForCallback = true;
        self._zui.onLineInput(self._receiveLineInput);
        break;
      case GNUSTO_EFFECT_INPUT_CHAR:
        self._isWaitingForCallback = true;
        self._zui.onCharacterInput(self._receiveCharacterInput);
        break;
      case GNUSTO_EFFECT_SAVE:
        engine.saveGame();
        if (self._zui.onSave(engine.saveGameData()))
          engine.answer(0, 1);
        else
          engine.answer(0, 0);
        break;
      case GNUSTO_EFFECT_RESTORE:
        var saveGameData = self._zui.onRestore();
        if (saveGameData) {
          engine.loadSavedGame(saveGameData);
        } else {
          engine.answer(0, 0);
        }
        break;
      case GNUSTO_EFFECT_QUIT:
        self.stop();
        self._zui.onQuit();
        break;
      case GNUSTO_EFFECT_RESTART:
        self.stop();
        self._zui.onRestart();
        break;
      case GNUSTO_EFFECT_WIMP_OUT:
        self._isWaitingForCallback = true;
        self._zui.onWimpOut(self._unWimpOut);
        break;
      case GNUSTO_EFFECT_BREAKPOINT:
        throw new FatalError("Unimplemented effect: " + effect);
      case GNUSTO_EFFECT_FLAGS_CHANGED:
        var isToTranscript = engine.m_printing_header_bits & 0x1;
        var isFixedWidth = engine.m_printing_header_bits & 0x2;
        self._zui.onFlagsChanged(isToTranscript, isFixedWidth);
        break;
      case GNUSTO_EFFECT_PIRACY:
				break;
//        throw new FatalError("Unimplemented effect: " + effect);
      case GNUSTO_EFFECT_STYLE:
        self._zui.onSetStyle(engine.effect(1),
                             engine.effect(2),
                             engine.effect(3));
        break;
      case GNUSTO_EFFECT_SOUND:
        // TODO: Actually implement this; for now we'll just
        // ignore it since it's not a required element of 'terps
        // and we don't want the game to crash.
        break;
      case GNUSTO_EFFECT_SPLITWINDOW:
        self._zui.onSplitWindow(engine.effect(1));
        break;
      case GNUSTO_EFFECT_SETWINDOW:
        self._zui.onSetWindow(engine.effect(1));
        break;
      case GNUSTO_EFFECT_ERASEWINDOW:
        self._zui.onEraseWindow(engine.effect(1));
        break;
      case GNUSTO_EFFECT_ERASELINE:
        throw new FatalError("Unimplemented effect: " + effect);
      case GNUSTO_EFFECT_SETCURSOR:
        self._zui.onSetCursor(engine.effect(2),
                              engine.effect(1));
        break;
      case GNUSTO_EFFECT_SETBUFFERMODE:
        self._zui.onSetBufferMode(engine.effect(1));
        break;
      case GNUSTO_EFFECT_SETINPUTSTREAM:
      case GNUSTO_EFFECT_GETCURSOR:
        throw new FatalError("Unimplemented effect: " + effect);
        break;
      case GNUSTO_EFFECT_PRINTTABLE:
        var numLines = engine.effect(1);
        // TODO: There's probably a more concise way of doing this
        // by using some built-in array function.
        var lines = [];
        for (i = 0; i < numLines; i++)
          lines.push(engine.effect(2+i));
        self._zui.onPrintTable(lines);
        break;
      }

      self._isInLoop = false;
    }
  };
  for (name in methods)
    self[name] = methods[name];
}
