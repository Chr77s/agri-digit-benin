// Photos de la galerie « Le Bénin agricole ». La section reste masquée tant que la liste est vide.
// Chaque photo affiche son auteur et sa licence (exigé par CC BY-SA). Vignettes 960 px de Wikimedia Commons.
export interface Photo { src: string; alt: string; width: number; height: number; author: string; license: string; source: string }

export const GALLERY: Photo[] = [
  {
    src: '/landing/mais-pobe.jpg', width: 960, height: 720,
    alt: 'Jeunes plants de maïs dans un champ détrempé après la pluie, à Pobé',
    author: 'Rachad Sanoussi', license: 'CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Champ_de_ma%C3%AFs_%C3%A0_Pob%C3%A9.jpg',
  },
  {
    src: '/landing/coton-atakora.jpg', width: 960, height: 640,
    alt: 'Champ de coton après la récolte, au pied de la chaîne de l’Atakora',
    author: 'Ji-Elle', license: 'CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:B%C3%A9nin-Champ_de_coton.jpg',
  },
  {
    src: '/landing/fonio-natitingou.jpg', width: 960, height: 640,
    alt: 'Un producteur bat le fonio avec une petite batteuse à moteur, près de Natitingou',
    author: 'Crop Trust', license: 'CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Threshing_fonio_with_a_small-scale_machine,_Natitingou,_northern_Benin.jpg',
  },
];
