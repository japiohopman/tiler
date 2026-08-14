/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { geminiTextureService } from '../services/geminiService';
import { tileProcessor } from '../image/tileProcessor';
import { seamAnalysisService } from '../services/seamAnalysisService';
import { exportService } from '../services/exportService';
import { runTileProcessorTestSuite } from '../image/tileProcessor.test';
import { runSeamAnalyzerTestSuite } from '../services/seamAnalysisService.test';

export const apiRouter = Router();

/**
 * Health check & pipeline status endpoint
 */
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Tile Generator Server',
    geminiConfigured: geminiTextureService.isConfigured(),
    sharpReady: true,
    supportedMaterials: ['cobblestone', 'wood', 'water', 'grass', 'lava', 'sand'],
    supportedResolutions: [128, 256, 512, 1024],
    timestamp: new Date().toISOString(),
  });
});

/**
 * AI Texture Generation Endpoint
 *
 * Executes full pipeline:
 * Gemini AI Generation (Raw) → Sharp Offset-Crossfade Processor → Seam Continuity Analyzer
 * Preserves both original raw image and processed tile.
 */
apiRouter.post('/generate', async (req, res) => {
  try {
    const {
      material,
      style = 'stylized',
      detail = 'high',
      additionalPrompt,
      customPrompt,
      resolution = 512,
      processingOptions,
    } = req.body;

    if (!material) {
      return res.status(400).json({ error: 'Material parameter is required.' });
    }

    // Step 1: Call server-side Gemini texture generation service
    const rawResult = await geminiTextureService.generateRawTexture({
      material,
      style,
      detail,
      additionalPrompt,
      customPrompt,
      resolution,
    });

    const tileId = `tile-${Date.now()}`;

    // Step 2: Deterministic Sharp tile processing (preserving raw image intact)
    const procOpts = processingOptions || {
      algorithm: 'offset-crossfade',
      blendMarginPercent: 10,
    };

    const processResult = await tileProcessor.processTile(rawResult.imageDataUrl, {
      algorithm: procOpts.algorithm || 'offset-crossfade',
      blendMarginPercent: procOpts.blendMarginPercent ?? 10,
      targetWidth: resolution,
      targetHeight: resolution,
    });

    // Step 3: Seam Continuity Analysis
    const processedBuffer = tileProcessor.toBuffer(processResult.processedImageDataUrl);
    const seamReport = await seamAnalysisService.analyzeSeams(processedBuffer, {
      threshold: 0.05,
      edgeRegion: 4,
      diagnosticMode: true,
    });

    // Step 4: Generation metadata package
    const generationMetadata = {
      model: rawResult.model,
      builtPrompt: rawResult.builtPrompt,
      material,
      style,
      detail,
      resolution,
      generatedAt: new Date().toISOString(),
      processingAlgorithm: processResult.metadata.algorithm,
      processingTimeMs: processResult.metadata.processingTimeMs,
      geminiDurationMs: rawResult.generationTimeMs,
      blendMarginPercent: processResult.metadata.blendMarginPercent,
    };

    res.json({
      success: true,
      tileId,
      prompt: rawResult.builtPrompt,
      rawImageUrl: rawResult.imageDataUrl, // Original preserved
      processedImageUrl: processResult.processedImageDataUrl, // Processed seamless tile
      offsetPreviewUrl: processResult.offsetPreviewDataUrl,
      generationMetadata,
      seamReport,
      processingMetadata: processResult.metadata,
      message: 'Generated texture via Gemini and executed full seamless tile pipeline.',
    });
  } catch (error: any) {
    console.error('Error in /api/generate:', error);
    res.status(500).json({ error: error.message || 'Generation failed' });
  }
});

/**
 * Raw AI Texture Generation Endpoint (Generates raw image without auto-processing)
 */
apiRouter.post('/generate-raw', async (req, res) => {
  try {
    const { material, style, detail, additionalPrompt, customPrompt, resolution = 512 } = req.body;

    if (!material) {
      return res.status(400).json({ error: 'Material parameter is required.' });
    }

    const rawResult = await geminiTextureService.generateRawTexture({
      material,
      style,
      detail,
      additionalPrompt,
      customPrompt,
      resolution,
    });

    res.json({
      success: true,
      tileId: `raw-${Date.now()}`,
      prompt: rawResult.builtPrompt,
      rawImageUrl: rawResult.imageDataUrl,
      model: rawResult.model,
      generationTimeMs: rawResult.generationTimeMs,
    });
  } catch (error: any) {
    console.error('Error in /api/generate-raw:', error);
    res.status(500).json({ error: error.message || 'Raw generation failed' });
  }
});

/**
 * Deterministic Sharp Image Processing & Seamless Blending Endpoint
 */
apiRouter.post('/process', async (req, res) => {
  try {
    const { image, options } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data URL or buffer is required.' });
    }

    const result = await tileProcessor.processTile(image, options);

    res.json({
      success: true,
      processedImageUrl: result.processedImageDataUrl,
      offsetPreviewUrl: result.offsetPreviewDataUrl,
      metadata: result.metadata,
      algorithmApplied: result.metadata.algorithm,
      message: 'Deterministic offset-crossfade seamless transformation complete.',
    });
  } catch (error: any) {
    console.error('Error in /api/process:', error);
    res.status(500).json({ error: error.message || 'Processing failed' });
  }
});

/**
 * Developer Test Suite Endpoint: runs processor automated unit tests on demand
 */
apiRouter.get('/test-processor', async (req, res) => {
  try {
    const suiteResult = await runTileProcessorTestSuite();
    res.json({
      success: true,
      suite: suiteResult,
    });
  } catch (error: any) {
    console.error('Error running test suite in /api/test-processor:', error);
    res.status(500).json({ error: error.message || 'Test suite execution failed' });
  }
});

/**
 * Seam Continuity Analysis Endpoint
 */
apiRouter.post('/analyze', async (req, res) => {
  try {
    const { image, options } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data URL is required for seam analysis.' });
    }

    const inputBuffer = tileProcessor.toBuffer(image);
    const report = await seamAnalysisService.analyzeSeams(inputBuffer, options);

    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Error in /api/analyze:', error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
});

/**
 * Seam Analyzer Test Suite Endpoint: runs seam analyzer automated verification cases
 */
apiRouter.get('/test-seams', async (req, res) => {
  try {
    const suiteResult = await runSeamAnalyzerTestSuite();
    res.json({
      success: true,
      suite: suiteResult,
    });
  } catch (error: any) {
    console.error('Error running seam test suite in /api/test-seams:', error);
    res.status(500).json({ error: error.message || 'Seam test suite execution failed' });
  }
});

/**
 * Game Texture Export Endpoint
 */
apiRouter.post('/export', async (req, res) => {
  try {
    const { tile, options } = req.body;
    const imageData = tile?.processedImageDataUrl || tile?.rawImageDataUrl;

    if (!imageData) {
      return res.status(400).json({ error: 'No image data to export.' });
    }

    const inputBuffer = tileProcessor.toBuffer(imageData);
    const { buffer, mimeType, filename } = await exportService.exportTexture(inputBuffer, options);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error: any) {
    console.error('Error in /api/export:', error);
    res.status(500).json({ error: error.message || 'Export failed' });
  }
});
