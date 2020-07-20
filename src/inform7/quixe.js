// Export Quixe engine

import Quixe from '../upstream/quixe/src/quixe/quixe.js'
import QuixeDispatch from '../upstream/quixe/src/quixe/gi_dispa.js'
import QuixeLoad from '../upstream/quixe/src/quixe/gi_load.js'

window.Quixe = Quixe.Quixe
window.GiDispa = QuixeDispatch.GiDispa
window.GiLoad = QuixeLoad.GiLoad