export interface CaptureOptions {
  url: string;
  fullPage?: boolean;
  skipClean?: boolean;
  waitForSelector?: string;
  viewportWidth?: number;
  timeoutMs?: number;
  extractElements?: boolean;
}

export interface InteractiveElement {
  id: string;
  tagName: string;
  role?: string;
  text?: string;
  href?: string;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface CaptureResponse {
  success: boolean;
  data: {
    image_url: string;
    metadata: {
      width: number;
      height: number;
      sizeBytes: number;
      tokens_used: number;
      title: string;
      resolvedUrl: string;
      elements?: InteractiveElement[];
    };
    processing_time: number;
  };
}

export class VisionStream {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'http://localhost:3000') {
    if (!apiKey) {
      throw new Error('VisionStream API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Captures a screenshot of the target URL.
   * @param options Capture options
   * @returns CaptureResponse promise
   */
  async capture(options: CaptureOptions): Promise<CaptureResponse> {
    const response = await fetch(`${this.baseUrl}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }
}
