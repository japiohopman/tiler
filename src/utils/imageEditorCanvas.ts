/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ImageEditorTransform {
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
}

export interface ImageEditorCrop {
  mode: 'none' | '1:1' | 'free';
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  width: number; // Percentage 0-100
  height: number; // Percentage 0-100
}

export interface ImageEditorColor {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  hue: number; // -180 to 180
}

export interface EditorState {
  transform: ImageEditorTransform;
  crop: ImageEditorCrop;
  color: ImageEditorColor;
}

export const DEFAULT_TRANSFORM: ImageEditorTransform = {
  rotation: 0,
  flipH: false,
  flipV: false,
};

export const DEFAULT_CROP: ImageEditorCrop = {
  mode: 'none',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
};

export const DEFAULT_COLOR: ImageEditorColor = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
};

export const DEFAULT_EDITOR_STATE: EditorState = {
  transform: { ...DEFAULT_TRANSFORM },
  crop: { ...DEFAULT_CROP },
  color: { ...DEFAULT_COLOR },
};

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Renders an image element onto a canvas with transform, crop, and color adjustments applied.
 */
export function renderImageToCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  state: EditorState
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imgW = image.naturalWidth || image.width || 512;
  const imgH = image.naturalHeight || image.height || 512;

  // 1. Calculate Crop Box in Source Pixels
  let sx = 0;
  let sy = 0;
  let sw = imgW;
  let sh = imgH;

  if (state.crop.mode === '1:1') {
    const squareSize = Math.min(imgW, imgH);
    sx = Math.floor((imgW - squareSize) / 2);
    sy = Math.floor((imgH - squareSize) / 2);
    sw = squareSize;
    sh = squareSize;
  } else if (state.crop.mode === 'free') {
    sx = Math.floor((state.crop.x / 100) * imgW);
    sy = Math.floor((state.crop.y / 100) * imgH);
    sw = Math.floor((state.crop.width / 100) * imgW);
    sh = Math.floor((state.crop.height / 100) * imgH);
    sw = Math.max(1, Math.min(imgW - sx, sw));
    sh = Math.max(1, Math.min(imgH - sy, sh));
  }

  // 2. Calculate Output Dimensions based on Rotation
  const isRotatedQuarter = state.transform.rotation === 90 || state.transform.rotation === 270;
  const destW = isRotatedQuarter ? sh : sw;
  const destH = isRotatedQuarter ? sw : sh;

  canvas.width = destW;
  canvas.height = destH;

  ctx.clearRect(0, 0, destW, destH);
  ctx.save();

  // 3. Apply Context Transform
  ctx.translate(destW / 2, destH / 2);
  ctx.scale(state.transform.flipH ? -1 : 1, state.transform.flipV ? -1 : 1);
  if (state.transform.rotation !== 0) {
    ctx.rotate((state.transform.rotation * Math.PI) / 180);
  }

  // Draw source crop rectangle centered
  ctx.drawImage(image, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();

  // 4. Apply Color Adjustments
  const { brightness, contrast, saturation, hue } = state.color;
  if (brightness !== 0 || contrast !== 0 || saturation !== 0 || hue !== 0) {
    try {
      const imgData = ctx.getImageData(0, 0, destW, destH);
      const data = imgData.data;

      const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const bOffset = brightness * 2.55;
      const satFactor = 1 + saturation / 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let bVal = data[i + 2];

        // Brightness
        if (brightness !== 0) {
          r = Math.min(255, Math.max(0, r + bOffset));
          g = Math.min(255, Math.max(0, g + bOffset));
          bVal = Math.min(255, Math.max(0, bVal + bOffset));
        }

        // Contrast
        if (contrast !== 0) {
          r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
          g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
          bVal = Math.min(255, Math.max(0, contrastFactor * (bVal - 128) + 128));
        }

        // Saturation
        if (saturation !== 0) {
          const gray = 0.2989 * r + 0.587 * g + 0.114 * bVal;
          r = Math.min(255, Math.max(0, gray + (r - gray) * satFactor));
          g = Math.min(255, Math.max(0, gray + (g - gray) * satFactor));
          bVal = Math.min(255, Math.max(0, gray + (bVal - gray) * satFactor));
        }

        // Hue
        if (hue !== 0) {
          const [hDeg, sPct, lPct] = rgbToHsl(r, g, bVal);
          const newH = (hDeg + hue + 360) % 360;
          const [nr, ng, nb] = hslToRgb(newH, sPct, lPct);
          r = nr;
          g = ng;
          bVal = nb;
        }

        data[i] = Math.round(r);
        data[i + 1] = Math.round(g);
        data[i + 2] = Math.round(bVal);
      }

      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn('Canvas pixel color manipulation failed or restricted:', e);
    }
  }
}

/**
 * Renders an image element to a Data URL string.
 */
export function renderImageToDataUrl(image: HTMLImageElement, state: EditorState): string {
  const canvas = document.createElement('canvas');
  renderImageToCanvas(canvas, image, state);
  return canvas.toDataURL('image/png');
}
