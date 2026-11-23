// Mode de fonctionnement, fixé à la compilation :
//   artefact : page publiée sur claude.ai, données de démonstration dans le navigateur
//   demo     : site public de démonstration (GitHub Pages), données dans le navigateur
//   serveur  : application de production, données sur le serveur (hébergeur certifié HDS)
/* global __MODE__ */
export const MODE = typeof __MODE__ !== 'undefined' ? __MODE__ : 'demo';
export const SERVEUR = MODE === 'serveur';
export const DEMONSTRATION = MODE !== 'serveur';
