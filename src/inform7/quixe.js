// Export Quixe engine

import QuixeModule from '../upstream/quixe/src/quixe/quixe.js'
import QuixeDispatch from '../upstream/quixe/src/quixe/gi_dispa.js'
import QuixeLoad from '../upstream/quixe/src/quixe/gi_load.js'

window.Quixe = QuixeModule.Quixe
window.GiDispa = QuixeDispatch.GiDispaClass
window.GiLoad = QuixeLoad.GiLoad