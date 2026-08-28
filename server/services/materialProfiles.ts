/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaterialId } from '../../src/types';

export interface MaterialProfile {
  id: MaterialId;
  canonicalName: string;
  category: 'ground' | 'liquid' | 'organic' | 'stone';
  descriptiveTerms: string[];
  visualCharacteristics: string[];
  positiveConstraints: string[];
  negativeConstraints: string[];
  tileWording: string[];
  forbiddenTerms: string[];
  providerGuidance?: string;
}

export const MATERIAL_PROFILES: Record<MaterialId, MaterialProfile> = {
  lava: {
    id: 'lava',
    canonicalName: 'Lava',
    category: 'liquid',
    descriptiveTerms: [
      'molten volcanic magma',
      'dark basalt rock crust',
      'glowing orange-red fissures',
      'liquid fire surface',
      'glowing lava veins',
    ],
    visualCharacteristics: [
      'emissive glowing cracks',
      'viscous fluid magma',
      'cooling dark basalt crust',
      'volcanic heat glow',
    ],
    positiveConstraints: [
      'top-down surface',
      'seamless ground texture',
      'uniform liquid magma',
      'molten magma texture',
    ],
    negativeConstraints: [
      'buildings',
      'houses',
      'roads',
      'streets',
      'vehicles',
      'characters',
      'sky',
      'landscape',
      'architecture',
      'trees',
      'cobblestone',
      'water',
      'grass',
      'grid',
      'border',
    ],
    tileWording: [
      'top-down view',
      'flat texture surface',
      'seamless tileable pattern',
    ],
    forbiddenTerms: [
      'building',
      'house',
      'road',
      'street',
      'vehicle',
      'car',
      'character',
      'person',
      'sky',
      'horizon',
      'tree',
      'cobblestone',
      'water',
      'grass',
      'window',
      'door',
      'roof',
      'arch',
      'castle',
    ],
    providerGuidance: 'Focus strictly on molten basalt lava ground texture surface without environment scene context.',
  },

  cobblestone: {
    id: 'cobblestone',
    canonicalName: 'Cobblestone',
    category: 'stone',
    descriptiveTerms: [
      'ancient irregular stone cobblestones',
      'mortar joints',
      'chipped rock edges',
      'weathered pavement surface',
      'durable stone blocks',
    ],
    visualCharacteristics: [
      'tactile stone relief',
      'natural mineral wear',
      'tight mortar seams',
      'interlocking paving stones',
    ],
    positiveConstraints: [
      'top-down ground pavement',
      'seamless stone texture',
      'uniform ground coverage',
      'stone paving texture',
    ],
    negativeConstraints: [
      'buildings',
      'houses',
      'roads with vehicles',
      'characters',
      'sky',
      'horizon',
      'furniture',
      'lava',
      'water',
      'grass',
      'grid',
      'border',
    ],
    tileWording: [
      'top-down view',
      'flat texture surface',
      'seamless tileable pattern',
    ],
    forbiddenTerms: [
      'building',
      'house',
      'vehicle',
      'car',
      'character',
      'person',
      'sky',
      'horizon',
      'window',
      'door',
      'roof',
      'lava',
      'water',
      'grass',
    ],
    providerGuidance: 'Emphasize tight stone paving blocks and mortar lines from direct top-down view.',
  },

  water: {
    id: 'water',
    canonicalName: 'Water',
    category: 'liquid',
    descriptiveTerms: [
      'clear blue water surface',
      'caustic light ripples',
      'turquoise aquatic fluid',
      'gentle water wavelets',
      'shimmering fluid depth',
    ],
    visualCharacteristics: [
      'shimmering caustic light patterns',
      'fluid ripple lines',
      'subtle underwater depth',
    ],
    positiveConstraints: [
      'top-down water surface',
      'seamless fluid texture',
      'uniform liquid surface',
      'clear water texture',
    ],
    negativeConstraints: [
      'boats',
      'ships',
      'buildings',
      'landscapes',
      'characters',
      'sky',
      'horizon',
      'islands',
      'lava',
      'cobblestone',
      'grass',
      'grid',
      'border',
      'frame',
    ],
    tileWording: [
      'top-down view',
      'flat texture surface',
      'seamless tileable pattern',
    ],
    forbiddenTerms: [
      'boat',
      'ship',
      'building',
      'house',
      'character',
      'person',
      'sky',
      'horizon',
      'island',
      'tree',
      'lava',
      'cobblestone',
      'grass',
    ],
    providerGuidance: 'Render pure liquid surface ripples and caustics without land masses or vessels.',
  },

  grass: {
    id: 'grass',
    canonicalName: 'Grass',
    category: 'ground',
    descriptiveTerms: [
      'lush green meadow grass turf',
      'fine blade clusters',
      'clovers',
      'earthy soil undertones',
      'natural lawn ground',
    ],
    visualCharacteristics: [
      'tactile grass blades',
      'soft natural green variation',
      'subtle soil patches',
    ],
    positiveConstraints: [
      'top-down meadow ground',
      'seamless grass texture',
      'uniform lawn coverage',
      'grass turf texture',
    ],
    negativeConstraints: [
      'houses',
      'fences',
      'buildings',
      'vehicles',
      'characters',
      'sky',
      'horizon',
      'lava',
      'cobblestone',
      'water',
      'grid',
      'border',
    ],
    tileWording: [
      'top-down view',
      'flat texture surface',
      'seamless tileable pattern',
    ],
    forbiddenTerms: [
      'house',
      'fence',
      'building',
      'vehicle',
      'character',
      'person',
      'sky',
      'horizon',
      'lava',
      'cobblestone',
      'water',
    ],
    providerGuidance: 'Focus on dense organic turf blades and natural ground cover without structures.',
  },

  wood: {
    id: 'wood',
    canonicalName: 'Wood',
    category: 'organic',
    descriptiveTerms: [
      'weathered timber wood floor planks',
      'horizontal grain lines',
      'wood knots',
      'tactile lumber grooves',
      'hardwood surface',
    ],
    visualCharacteristics: [
      'natural wood grain',
      'soft lumber knots',
      'plank seams',
    ],
    positiveConstraints: [
      'top-down wooden floor',
      'seamless wood texture',
      'uniform plank coverage',
      'wood plank texture',
    ],
    negativeConstraints: [
      'furniture',
      'chairs',
      'tables',
      'houses',
      'buildings',
      'characters',
      'sky',
      'horizon',
      'lava',
      'water',
      'grid',
      'border',
    ],
    tileWording: [
      'top-down view',
      'flat texture surface',
      'seamless tileable pattern',
    ],
    forbiddenTerms: [
      'chair',
      'table',
      'furniture',
      'building',
      'house',
      'character',
      'person',
      'sky',
      'horizon',
      'lava',
      'water',
    ],
    providerGuidance: 'Direct overhead view of continuous wood planking.',
  },

  sand: {
    id: 'sand',
    canonicalName: 'Sand',
    category: 'ground',
    descriptiveTerms: [
      'fine golden desert sand grains',
      'wind-blown micro-ripples',
      'smooth dune granule texture',
      'beach sand surface',
    ],
    visualCharacteristics: [
      'soft ripple lines',
      'fine granule texture',
      'even golden tone',
    ],
    positiveConstraints: [
      'top-down sand ground',
      'seamless sand texture',
      'uniform sand coverage',
      'granular sand texture',
    ],
    negativeConstraints: [
      'pyramids',
      'camels',
      'buildings',
      'vehicles',
      'characters',
      'sky',
      'horizon',
      'lava',
      'water',
      'grid',
      'border',
    ],
    tileWording: [
      'top-down view',
      'flat texture surface',
      'seamless tileable pattern',
    ],
    forbiddenTerms: [
      'pyramid',
      'camel',
      'building',
      'house',
      'vehicle',
      'character',
      'person',
      'sky',
      'horizon',
      'lava',
      'water',
    ],
    providerGuidance: 'Direct overhead view of smooth sand grain ground.',
  },
};

/**
 * Retrieves a material profile by ID or returns a default fallback profile
 */
export function getMaterialProfile(materialId: string): MaterialProfile {
  const norm = materialId.toLowerCase().trim() as MaterialId;
  if (MATERIAL_PROFILES[norm]) {
    return MATERIAL_PROFILES[norm];
  }

  // Fallback profile for unknown custom materials
  return {
    id: norm as MaterialId,
    canonicalName: norm.charAt(0).toUpperCase() + norm.slice(1),
    category: 'ground',
    descriptiveTerms: [`${norm} material surface`, `natural ${norm} texture`],
    visualCharacteristics: [`tactile ${norm} details`],
    positiveConstraints: ['top-down material surface', 'seamless ground texture', 'uniform coverage'],
    negativeConstraints: ['buildings', 'houses', 'roads', 'vehicles', 'characters', 'sky', 'horizon', 'landscape'],
    tileWording: ['top-down 90-degree overhead orthographic view', 'flat texture-only surface', 'seamless tileable repeating pattern'],
    forbiddenTerms: ['building', 'house', 'road', 'vehicle', 'character', 'person', 'sky', 'horizon'],
  };
}
