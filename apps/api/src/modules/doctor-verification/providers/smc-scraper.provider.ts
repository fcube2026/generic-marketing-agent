import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmcVerificationRequest {
  registrationNumber: string;
  fullName: string;
  stateCouncil: string;
}

export interface SmcVerificationResult {
  found: boolean;
  name?: string;
  registrationNumber?: string;
  status?: string;
  imageUrl?: string;
  councilName?: string;
  screenshotUrl?: string;
  rawResponse?: Record<string, unknown>;
}

/**
 * State Medical Council (SMC) portal verification provider.
 *
 * In production this service uses Playwright to scrape SMC portals.
 * For staging / mock mode it returns a simulated result.
 *
 * Configure via:
 *   SMC_SCRAPER_ENABLED=true  — enable live scraping (requires Playwright service)
 *   SMC_SCRAPER_URL           — base URL of the Playwright scraper microservice
 */
@Injectable()
export class SmcScraperProvider {
  private readonly logger = new Logger(SmcScraperProvider.name);
  private readonly enabled: boolean;
  private readonly scraperUrl: string | undefined;

  constructor(private config: ConfigService) {
    this.enabled = config.get<string>('SMC_SCRAPER_ENABLED') === 'true';
    this.scraperUrl = config.get<string>('SMC_SCRAPER_URL');
  }

  async verify(req: SmcVerificationRequest): Promise<SmcVerificationResult> {
    if (!this.enabled) {
      return this.mockVerify(req);
    }
    return this.callScraperService(req);
  }

  private mockVerify(req: SmcVerificationRequest): SmcVerificationResult {
    this.logger.log(
      `[smc-mock] Checking SMC portal for: ${req.registrationNumber} / ${req.stateCouncil}`,
    );
    // Mock: simulate an 80% hit rate for staging
    const mockFound = req.registrationNumber.length > 4;
    return {
      found: mockFound,
      name: mockFound ? req.fullName : undefined,
      registrationNumber: mockFound ? req.registrationNumber : undefined,
      status: mockFound ? 'ACTIVE' : undefined,
      councilName: req.stateCouncil,
      rawResponse: { source: 'mock', council: req.stateCouncil },
    };
  }

  private async callScraperService(
    req: SmcVerificationRequest,
  ): Promise<SmcVerificationResult> {
    if (!this.scraperUrl) {
      throw new Error(
        'SMC_SCRAPER_URL must be set when SMC_SCRAPER_ENABLED=true',
      );
    }

    this.logger.log(
      `[smc-scraper] Sending scrape request for: ${req.registrationNumber}`,
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    let response: Response;
    try {
      response = await fetch(`${this.scraperUrl}/scrape/smc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_number: req.registrationNumber,
          full_name: req.fullName,
          state_council: req.stateCouncil,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      this.logger.warn(
        `[smc-scraper] Scraper error ${response.status}: ${JSON.stringify(data)}`,
      );
      throw new Error(`SMC scraper returned HTTP ${response.status}`);
    }

    return {
      found: data.found as boolean,
      name: data.name as string | undefined,
      registrationNumber: data.registration_number as string | undefined,
      status: data.status as string | undefined,
      imageUrl: data.image_url as string | undefined,
      screenshotUrl: data.screenshot_url as string | undefined,
      councilName: data.council_name as string | undefined,
      rawResponse: data,
    };
  }
}
