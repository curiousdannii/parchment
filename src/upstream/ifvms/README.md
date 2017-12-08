ifvms.js
========

ifvms.js, the Javascript Interactive Fiction Virtual Machines project is a new set of third generation VM engines for web IF interpreters. Like the second generation VMs Gnusto and Quixe, the ifvms.js VMs include a Just-In-Time disassembler/compiler. What justifies the third generation label is that the disassembler generates an Abstract Syntax Tree, allowing Inform idioms, for example for and while loops, to be identified and mapped to Javascript control structures (currently not enabled). Identifying these idioms allows the JIT code to run for longer, lowering overheads and therefore increasing performance.

Currently only the Z-Machine is supported, but plans to support Glulx and possibly TADS are in the works.

ifvms.js is MIT licenced, but please help the community by sharing any changes you make with us.

Playing stories with ifvms.js
-----------------------------

ifvms.js is used by [Parchment](https://github.com/curiousdannii/parchment). To play a story with Parchment go to [iplayif.com](https://iplayif.com).

ifvms.js is also included in the desktop interpreter [Lectrote](https://github.com/erkyrath/lectrote).

A minimalistic terminal interpreter is also available. If you install the ifvms npm package globally then the `zvm` script will be added to your path:

```
npm install -g ifvms
zvm story.z5
zvm story.zblorb
```

Testing ifvms.js
----------------

Simply running `make` is enough to run the test suite.