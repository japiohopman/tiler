/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MaterialId = 'cobblestone' | 'wood' | 'water' | 'grass' | 'lava' | 'sand';

export interface MaterialDefinition {
  id: MaterialId;
  name: string;
  category: 'ground' | 'liquid' | 'organic' | 'stone';
  description: string;
  defaultPrompt: string;
  colorHint: string;
}

export type StyleId = 'pixel-art' | 'hand-painted' | 'stylized' | 'photorealistic' | 'retro-16bit';

export interface StyleDefinition {
  id: StyleId;
  name: string;
  description: string;
  promptModifier: string;
}

export type DetailLevel = 'subtle' | 'medium' | 'high' | 'ultra';

export interface GenerateTileRequest {
  material: MaterialId | string;
  style: StyleId | string;
  detail?: DetailLevel | string;
  additionalPrompt?: string;
  customPrompt?: string;
  resolution?: SupportedResolution | number;
  seed?: number;
  processingOptions?: TileProcessingOptions;
  providerId?: string;
}

export interface GenerationParams {
  material: MaterialId;
  style: StyleId;
  detail?: DetailLevel;
  additionalPrompt?: string;
  customPrompt?: string;
  resolution: number; // default 512
  seed?: number;
}

export interface GenerationMetadata {
  provider?: string;
  model: string;
  builtPrompt: string;
  material: string;
  style: string;
  detail?: string;
  resolution: number;
  seed?: number;
  generatedAt: string;
  processingAlgorithm?: string;
  processingTimeMs?: number;
  generationDurationMs?: number;
  geminiDurationMs?: number; // Legacy compatibility
  blendMarginPercent?: number;
  rawSeamScore?: number;
  processedSeamScore?: number;
}

export interface GenerationState {
  status: 'idle' | 'generating' | 'processing' | 'analyzing' | 'completed' | 'error';
  currentStep: string;
  progress: number; // 0 - 100
  errorMessage?: string;
}

export type EdgeRegionDepth = 1 | 2 | 4 | 8;

export interface SeamAnalysisOptions {
  threshold?: number; // Default: 0.05 (normalized 0.0 to 1.0)
  edgeRegion?: EdgeRegionDepth; // Default: 4 (1, 2, 4, or 8 pixels)
  diagnosticMode?: boolean; // Default: false (whether to generate visual heatmap)
}

export interface SeamAnalysisResult {
  horizontalScore: number; // 0.0 = perfect match, higher = discontinuity (0.0 to 1.0)
  verticalScore: number; // 0.0 = perfect match, higher = discontinuity (0.0 to 1.0)
  overallScore: number; // 0.0 = perfect match, higher = discontinuity (0.0 to 1.0)
  width: number;
  height: number;
  pass: boolean;
  threshold: number; // Configurable threshold used for evaluation (default 0.05)
  edgeRegion: number; // Edge sample band width used (1, 2, 4, 8)
  diagnosticMapDataUrl?: string; // Visual difference heatmap representation
  maxHorizontalDelta: number;
  maxVerticalDelta: number;
  discontinuousPixelCount: number;
  totalEdgePixelsEvaluated: number;
  issues: string[];
  // Compatibility fields for legacy UI components
  horizontalSeamDiff?: number;
  verticalSeamDiff?: number;
  overallTileabilityScore?: number;
  isSeamless?: boolean;
}

export type SeamAnalysisReport = SeamAnalysisResult;

export type SupportedResolution = 128 | 256 | 512 | 1024;
export type BlendMarginPercent = 0 | 5 | 10 | 15 | 20;
export type TilePreviewMode = 'single' | '3x3' | 'infinite';

export interface TileProcessingOptions {
  algorithm?: 'offset-crossfade';
  blendMarginPercent?: BlendMarginPercent; // 0, 5, 10, 15, or 20 (default 10)
  targetWidth?: SupportedResolution; // 128, 256, 512, 1024 (default 512)
  targetHeight?: SupportedResolution;
}

export interface TileProcessingMetadata {
  inputDimensions: { width: number; height: number };
  outputDimensions: { width: number; height: number };
  blendMarginPercent: BlendMarginPercent;
  blendMarginPixels: { x: number; y: number };
  algorithm: string;
  processingTimeMs: number;
  isDeterministic: boolean;
  checksum: string;
  seamScore?: number;
  seamResult?: SeamAnalysisResult;
}

export interface TileProcessingResult {
  processedImageBuffer?: Buffer;
  processedImageDataUrl: string;
  offsetPreviewDataUrl?: string;
  metadata: TileProcessingMetadata;
  seamResult?: SeamAnalysisResult;
}

export interface ProcessorTestRunItem {
  name: string;
  resolution: SupportedResolution;
  blendPercent: BlendMarginPercent;
  passed: boolean;
  durationMs: number;
  details: string;
}

export interface ProcessorTestSuiteResult {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: ProcessorTestRunItem[];
  allPassed: boolean;
}

export interface ExportOptions {
  format: 'png' | 'webp' | 'jpeg';
  resolution: 256 | 512 | 1024;
  exportGridSheet: boolean;
  gridSheetSize: 2 | 3 | 4;
  includeSeamReport: boolean;
  includeMetadata: boolean;
}

export interface ValidationSummary {
  generationStatus: 'SUCCESS' | 'ERROR';
  rawTileable: boolean;
  processedTileable: boolean;
  rawSeamScore: number;
  processedSeamScore: number;
  improvement: number;
  improvementStatus: 'IMPROVED' | 'WORSENED' | 'UNCHANGED';
  finalStatus: 'PASS_RAW' | 'PASS_AFTER_PROCESSING' | 'VALIDATION_FAILED';
  threshold: number;
  issues: string[];
  promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED';
}

export interface Tile {
  id: string;
  name: string;
  material: MaterialId;
  style: StyleId;
  prompt: string;
  resolution: number; // 512
  rawImageDataUrl?: string;
  processedImageDataUrl?: string;
  isTileable: boolean;
  seamScore?: number;
  rawSeamScore?: number;
  seamReport?: SeamAnalysisReport;
  rawSeamReport?: SeamAnalysisReport;
  validationSummary?: ValidationSummary;
  createdAt: string;
  generationMetadata?: GenerationMetadata;
  metadata?: {
    provider?: string;
    model?: string;
    seed?: number;
    processingAlgorithm?: string;
    processingTimeMs?: number;
  };
}

export const TARGET_MATERIALS: MaterialDefinition[] = [
  {
    id: 'cobblestone',
    name: 'Cobblestone',
    category: 'stone',
    description: 'Irregular stone blocks with mortar grooves, durable pavement texture.',
    defaultPrompt: 'top-down seamless cobblestone pavement texture, flat lighting, game asset, high detail',
    colorHint: '#78716c',
  },
  {
    id: 'wood',
    name: 'Wood',
    category: 'organic',
    description: 'Planked hardwood or timber grain surface for floors and crates.',
    defaultPrompt: 'top-down seamless wooden floor planks texture, wood grain knots, flat even lighting',
    colorHint: '#b45309',
  },
  {
    id: 'water',
    name: 'Water',
    category: 'liquid',
    description: 'Clear animated fluid ripples and caustic reflections for aquatic terrain.',
    defaultPrompt: 'top-down seamless water surface texture, subtle caustic ripples, crystal clear turquoise',
    colorHint: '#0284c7',
  },
  {
    id: 'grass',
    name: 'Grass',
    category: 'ground',
    description: 'Lush meadow turf with clover and natural soil blending.',
    defaultPrompt: 'top-down seamless green grass meadow texture, natural blades, flat game sprite lighting',
    colorHint: '#16a34a',
  },
  {
    id: 'lava',
    name: 'Lava',
    category: 'liquid',
    description: 'Molten magma cracks with glowing embers and dark basalt crust.',
    defaultPrompt: 'top-down seamless molten lava magma texture, glowing orange veins, dark basalt rock crust',
    colorHint: '#dc2626',
  },
  {
    id: 'sand',
    name: 'Sand',
    category: 'ground',
    description: 'Desert dunes and beach granules with gentle wind-swept ripple lines.',
    defaultPrompt: 'top-down seamless desert sand dune texture, fine granules, gentle wind ripples, flat lighting',
    colorHint: '#d97706',
  },
];

export const TARGET_STYLES: StyleDefinition[] = [
  {
    id: 'pixel-art',
    name: 'Pixel Art',
    description: 'Crisp 16-bit / 32-bit pixel aesthetic with hand-placed clusters.',
    promptModifier: 'pixel art style, 16-bit retro game asset, clean dithering, limited palette',
  },
  {
    id: 'hand-painted',
    name: 'Hand-Painted',
    description: 'Painterly stylized fantasy brushwork with soft ambient occlusion.',
    promptModifier: 'hand painted texture, stylized fantasy game asset, World of Warcraft style brush strokes',
  },
  {
    id: 'stylized',
    name: 'Stylized Vibrant',
    description: 'Bold shapes, clean bevels, and vibrant saturation for modern games.',
    promptModifier: 'stylized game texture, clean shapes, vibrant colors, gentle shading, isometric 2D ready',
  },
  {
    id: 'photorealistic',
    name: 'Photorealistic',
    description: 'High-fidelity PBR-aligned surface detail and micro-textures.',
    promptModifier: 'photorealistic 2D surface texture, flat scan, uniform ambient lighting, 8k texture detail',
  },
  {
    id: 'retro-16bit',
    name: 'Retro 16-Bit',
    description: 'Classic RPG Maker / SNES top-down tile aesthetic.',
    promptModifier: 'classic 16-bit JRPG top-down tileset asset, clean tile boundaries, retro color grading',
  },
];
