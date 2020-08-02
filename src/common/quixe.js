// Export Quixe engine

import QuixeModule from '../upstream/quixe/src/quixe/quixe.js'
import QuixeDispatch from '../upstream/quixe/src/quixe/gi_dispa.js'
import QuixeLoad from '../upstream/quixe/src/quixe/gi_load.js'

export const Quixe = QuixeModule.Quixe
export const GiDispa = QuixeDispatch.GiDispa
export const GiLoad = QuixeLoad.GiLoad