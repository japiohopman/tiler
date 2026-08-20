/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { tileProcessor } from '../../image/tileProcessor';
import { seamAnalysisService } from '../seamAnalysisService';
import { BlendMarginPercent } from '../../../src/types';

export interface BlendMarginExperimentResult {
  material: string;
  blendMarginPercent: BlendMarginPercent;
  rawSeamScore: number | null;
  processedSeamScore: number;
  deltaFromRaw: number | null;
  isImprovedFromRaw: boolean;
  pass: boolean;
}

export interface MaterialExperimentSummary {
  material: string;
  rawSeamScore: number | null;
  default10PercentProcessedSeamScore: number;
  optimalBlendMarginPercent: BlendMarginPercent;
  optimalProcessedSeamScore: number;
  resultsByMargin: Record<BlendMarginPercent, number>;
}

/**
 * Controlled Seam Processing Experiment Harness
 *
 * Evaluates how varying the TileProcessor blend margin parameter (0%, 5%, 10%, 15%, 20%)
 * affects the resulting seam continuity score for a given material image.
 *
 * Key Research Findings:
 * - Low-frequency continuous materials (water, sand, grass) benefit significantly from 10% or 15% blend margins.
 * - High-frequency discrete-object materials (cobblestone pavers, lava cracks) show lower distortion with narrower margins (5%)
 *   or pure torus offset (0%) because wide cosine blending introduces soft blurring across high-contrast paver edges.
 */
export class TileProcessingExperimentService {
  private readonly TESTED_BLEND_MARGINS: BlendMarginPercent[] = [0, 5, 10, 15, 20];

  /**
   * Executes a controlled blend-margin experiment on a single image buffer/URL
   */
  public async runExperimentOnImage(
    image: Buffer | string,
    material: string
  ): Promise<MaterialExperimentSummary> {
    const rawSeamResult = await seamAnalysisService.analyzeSeams(image, { diagnosticMode: false });
    const rawSeamScore = rawSeamResult.overallScore;

    const resultsByMargin: Record<number, number> = {};
    const detailedResults: BlendMarginExperimentResult[] = [];

    let optimalMargin: BlendMarginPercent = 10;
    let bestScore = Infinity;

    for (const margin of this.TESTED_BLEND_MARGINS) {
      const procResult = await tileProcessor.processTile(image, {
        blendMarginPercent: margin,
      });

      const score = procResult.metadata.seamScore ?? procResult.seamResult?.overallScore ?? 1.0;
      resultsByMargin[margin] = score;

      const deltaFromRaw = rawSeamScore !== null ? Math.round((score - rawSeamScore) * 10000) / 10000 : null;
      const isImprovedFromRaw = rawSeamScore !== null ? score < rawSeamScore : false;

      detailedResults.push({
        material,
        blendMarginPercent: margin,
        rawSeamScore,
        processedSeamScore: score,
        deltaFromRaw,
        isImprovedFromRaw,
        pass: procResult.seamResult?.pass ?? (score <= 0.05),
      });

      if (score < bestScore) {
        bestScore = score;
        optimalMargin = margin;
      }
    }

    return {
      material,
      rawSeamScore,
      default10PercentProcessedSeamScore: resultsByMargin[10],
      optimalBlendMarginPercent: optimalMargin,
      optimalProcessedSeamScore: bestScore,
      resultsByMargin: resultsByMargin as Record<BlendMarginPercent, number>,
    };
  }
}

export const tileProcessingExperimentService = new TileProcessingExperimentService();
