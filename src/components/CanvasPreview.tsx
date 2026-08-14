/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TilePreview, TilePreviewProps } from './TilePreview';

export interface CanvasPreviewProps extends TilePreviewProps {
  isSeamless?: boolean;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = (props) => {
  return <TilePreview {...props} />;
};
