Parchment
=========

Parchment is the Interactive Fiction player for the web. To play a story with Parchment go to <https://iplayif.com>!

Parchment for Inform 7
----------------------

[Inform 7](http://inform7.com/) includes Parchment, allowing you to produce [personal websites for your stories](http://inform7.com/book/WI_25_11.html). If you want to update the version of Parchment used by Inform 7, grab [parchment-for-inform7.zip](https://github.com/curiousdannii/parchment/raw/gh-pages/dist/inform7/parchment-for-inform7.zip) and unzip it into the Templates subfolder of your project's Materials folder.

If you would like to make a website like what Inform 7 would produce, but for a pre-existing storyfile, we recommend [ifsitegen.py](https://intfiction.org/t/ifsitegen-py/50576). You can download parchment-for-inform7.zip and pass it with the `-i` option and it will use the new version instead of the old one bundled with Inform 7:

```
python3 ifsitegen.py -i parchment-for-inform7.zip Storyfile.ulx
```

Single File Build
-----------------

Parchment is also available as a single file, suitable for downloading and using offline. [Download it here](https://github.com/curiousdannii/parchment/raw/gh-pages/dist/single-file/parchment-single-file.zip).

Free Software
-------------

Parchment is MIT licensed, and incorporates the following upstream projects:

Name    | Upstream repo | License
------- | ------------- | -------
AsyncGlk | [curiousdannii/asyncglk](https://github.com/curiousdannii/asyncglk) | [MIT](https://github.com/curiousdannii/asyncglk/blob/master/LICENSE)
Bocfel  | [garglk/garglk](https://github.com/garglk/garglk) | [GPL-2.0](https://github.com/garglk/garglk/blob/master/terps/bocfel/COPYING.GPLv2)/[GPL-3.0](https://github.com/garglk/garglk/blob/master/terps/bocfel/COPYING.GPLv3)
Emglken | [curiousdannii/emglken](https://github.com/curiousdannii/emglken) | [MIT](https://github.com/curiousdannii/emglken/blob/master/LICENSE)
Git     | [DavidKinder/Git](https://github.com/DavidKinder/Git) | [MIT](https://github.com/DavidKinder/Git/blob/master/README.txt)
GlkOte  | [erkyrath/glkote](https://github.com/erkyrath/glkote) | [MIT](https://github.com/erkyrath/glkote/blob/master/LICENSE)
Glulxe  | [erkyrath/glulxe](https://github.com/erkyrath/glulxe) | [MIT](https://github.com/erkyrath/glulxe/blob/master/LICENSE)
Hugo    | [hugoif/hugo-unix](https://github.com/hugoif/hugo-unix) | [BSD-2-Clause](https://github.com/hugoif/hugo-unix/blob/master/License.txt)
Iosevka | [be5invis/Iosevka](https://github.com/be5invis/Iosevka) | [OFL](https://github.com/be5invis/Iosevka/blob/master/LICENSE.md)
jQuery  | [jquery/jquery](https://github.com/jquery/jquery) | [MIT](https://github.com/jquery/jquery/blob/main/LICENSE.txt)
Quixe   | [erkyrath/quixe](https://github.com/erkyrath/quixe) | [MIT](https://github.com/erkyrath/quixe/blob/master/LICENSE)
RemGlk  | [erkyrath/remglk](https://github.com/erkyrath/remglk) | [MIT](https://github.com/erkyrath/remglk/blob/master/LICENSE)
Scare   | [garglk/garglk](https://github.com/garglk/garglk) | [GPL-2.0](https://github.com/garglk/garglk/blob/master/terps/scare/COPYING)
TADS    | [tads-intfic/tads-runner](https://github.com/tads-intfic/tads-runner) | [GPL-2.0](https://github.com/tads-intfic/tads-runner/blob/master/COPYING)
ZVM     | [curiousdannii/ifvms.js](https://github.com/curiousdannii/ifvms.js) | [MIT](https://github.com/curiousdannii/ifvms.js/blob/master/LICENSE)

Building Instructions
---------------------

Parchment is only designed for building in Linux and may not work in other OSes. You'll need to install Git and Node version >= 16.

The upstream projects are included as git submodules. Start by initializing the submodules:

```
git submodule update --init --recursive
```

Then install the `npm` dependencies:

```
npm install
```

This will also automatically build Parchment.

Then, you'll need to open `index.html` on a web server. (It won't work when you run it on your filesystem as a `file:///` URL.) You can launch a simple web server like this:

```
npm start
```

Then you can view Parchment at `http://localhost:8080` to see your handiwork.

Each time you change code in the `src` folder, the server will automatically rebuild the web code. Refresh to see your changes.

You can also build your own `dist/inform/parchment-for-inform7.zip` like this:

```
npm install
npm run inform7
```
