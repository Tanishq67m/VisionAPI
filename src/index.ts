// ─── Vision-Ready Screenshot API — Public Exports ────────────────────────────
//
// Import from this file in your Next.js API routes and MCP server:
//
//   import { captureForAI } from '@/lib/screenshot';
//   import type { CaptureOptions, CaptureResult } from '@/lib/screenshot';

export { captureForAI, closeBrowser } from './captureForAI.js';
export { cleanPage } from './utils/cleanPage.js';
export { smartWait } from './utils/smartWait.js';
export { observePage } from './utils/observe.js';
export type {
  CaptureOptions,
  CaptureResult,
  CleanPageOptions,
  SmartWaitOptions,
  CaptureErrorCode,
  ResourceType,
  PageObservation,
  ObservedButton,
  ObservedLink,
  ObservedForm,
  ObservedFormField,
  ObservedInput,
  ObservedTable,
  ObservedImage,
  ObservedHeading,
  BoundingBox,
} from './types/capture.js';
export { CaptureError } from './types/capture.js';