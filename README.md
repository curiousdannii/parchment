Parchment
=========

Parchment is the Interactive Fiction player for the web. To play a story with Parchment go to <http://iplayif.com>!

Most of Parchment is BSD licenced, except for Gunch which is GPL 3. Please use Parchment freely, but consider helping the community by sharing any changes you make with us.

Parchment for Inform 7
----------------------

[Inform 7](http://inform7.com/) includes Parchment, allowing you to produce [personal websites for your stories](http://inform7.com/learn/man/WI_25_11.html). If you want to update the version of Parchment used by Inform 7, grab [parchment-for-inform7.zip](https://raw.github.com/curiousdannii/parchment/master/lib/parchment-for-inform7.zip) and unzip it into the Templates subfolder of your project's Materials folder.

Building Parchment
-----------------

We use [Node.js](http://nodejs.org/) and [Grunt](http://gruntjs.com/) to build and test Parchment. Install Node.js and then, from the Parchment directory, install our dependencies:

```
npm install
```

To build everything run the following:

```
npm run build
```