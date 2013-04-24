Parchment
=========

Parchment is the Interactive Fiction player for the web. For more information see [our Google Code site](http://code.google.com/p/parchment). To play a story with it, go to <http://iplayif.com>!

Parchment is BSD licenced, but please help the community by sharing any changes you make with us.

Parchment for Inform 7
----------------------

[Inform 7](http://inform7.com/) includes Parchment, allowing you to produce [personal websites for your stories](http://inform7.com/learn/man/doc394.html). If you want to update the version of Parchment used by Inform 7, grab [parchment-for-inform7.zip](https://raw.github.com/curiousdannii/parchment/master/lib/parchment-for-inform7.zip) and unzip it into the Templates subfolder of your project's Materials folder.

Building Parchment
-----------------

We use [Node.js](http://nodejs.org/) and [Grunt](http://gruntjs.com/) to build and test Parchment. Install Node.js, and then install the grunt-cli package:

```
npm install -g grunt-cli
```

Then from the Parchment directory install our dependencies:

```
npm install
```

To build everything run the following:

```
grunt
```