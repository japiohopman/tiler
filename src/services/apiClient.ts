/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ExportOptions,
  GenerateTileRequest,
  GenerationMetadata,
  GenerationParams,
  SeamAnalysisOptions,
  SeamAnalysisReport,
  SeamAnalysisResult,
  Tile,
  TileProcessingOptions,
  ValidationSummary,
} from '../types';

export interface GenerateApiResponse {
  success: boolean;
  tileId: string;
  rawImageUrl?: string;
  processedImageUrl?: string;
  offsetPreviewUrl?: string;
  prompt: string;
  generationMetadata?: GenerationMetadata;
  seamReport?: SeamAnalysisResult;
  rawSeamReport?: SeamAnalysisResult;
  validationSummary?: ValidationSummary;
  processingMetadata?: any;
  message?: string;
  error?: string;
}

export interface ProcessApiResponse {
  success: boolean;
  processedImageUrl: string;
  offsetPreviewUrl?: string;
  metadata: {
    inputDimensions: { width: number; height: number };
    outputDimensions: { width: number; height: number };
    blendMarginPercent: number;
    blendMarginPixels: { x: number; y: number };
    algorithm: string;
    processingTimeMs: number;
    isDeterministic: boolean;
    checksum: string;
    seamScore?: number;
    seamResult?: SeamAnalysisResult;
  };
  algorithmApplied: string;
  message?: string;
  error?: string;
}

export interface AnalyzeApiResponse {
  success: boolean;
  report: SeamAnalysisResult;
  error?: string;
}

export interface HealthCheckResponse {
  status: string;
  activeProvider: string;
  providerConfigured: boolean;
  sharpReady: boolean;
}

/**
 * Client service abstraction for communicating with backend tile services.
 * All image generation, Sharp processing, and seam analysis are executed server-side
 * to keep API keys secure and leverage native C++ Sharp image processing modules.
 */
class TileApiClient {
  private baseUrl = '/api';

  /**
   * Health check to ensure server-side pipeline is active
   */
  async checkHealth(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Backend health check failed:', error);
      return { status: 'offline', activeProvider: 'mock', providerConfigured: false, sharpReady: false };
    }
  }

  /**
   * Triggers server-side AI visual texture generation via configured provider (e.g., Pixazo, Mock, Gemini)
   * and executes full Sharp seamless pipeline + Seam continuity analyzer.
   */
  async generateTile(params: GenerateTileRequest | GenerationParams): Promise<GenerateApiResponse> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network response error' }));
      throw new Error(errorData.error || `Generation failed with status ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Triggers local server-side Sharp seamless tile processing pipeline
   */
  async processTile(
    tileImageData: string,
    options: TileProcessingOptions
  ): Promise<ProcessApiResponse> {
    const response = await fetch(`${this.baseUrl}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: tileImageData,
        options,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Processing error' }));
      throw new Error(errorData.error || `Processing failed with status ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Requests server-side mathematical seam continuity analysis
   */
  async analyzeSeams(
    tileImageData: string,
    options?: SeamAnalysisOptions
  ): Promise<AnalyzeApiResponse> {
    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: tileImageData, options }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Analysis error' }));
      throw new Error(errorData.error || `Analysis failed with status ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Runs the automated test suite on the backend TileProcessor
   */
  async runProcessorTests(): Promise<{ success: boolean; suite: any }> {
    const response = await fetch(`${this.baseUrl}/test-processor`);
    if (!response.ok) {
      throw new Error(`Test suite runner failed with status ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Runs the automated test suite on the backend Seam Analyzer
   */
  async runSeamTests(): Promise<{ success: boolean; suite: any }> {
    const response = await fetch(`${this.baseUrl}/test-seams`);
    if (!response.ok) {
      throw new Error(`Seam test suite runner failed with status ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Requests texture export in selected format and grid layout
   */
  async exportTile(tile: Tile, options: ExportOptions): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tile, options }),
    });

    if (!response.ok) {
      throw new Error(`Export failed with status ${response.status}`);
    }

    return await response.blob();
  }
}

export const tileApiClient = new TileApiClient();
