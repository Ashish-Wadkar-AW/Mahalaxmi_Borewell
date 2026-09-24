import { OFFICIAL_STAMP_BASE64, AUTHORIZED_SIGNATURE_BASE64 } from '../assets/images/stampSignatureBase64';
import { LOGO_QUOTATION_BASE64 } from '../assets/images/logoBase64';

export interface QuotationAssetImages {
  logoDataUri: string;
  stampDataUri: string;
  signatureDataUri: string;
}

/**
 * Reusable utility for accessing offline base64 image data URIs
 * for high-fidelity PDF rendering and document views.
 */
export class PdfImageUtils {
  /**
   * Returns the official company stamp as a Base64 data URI.
   */
  public static getOfficialStampDataUri(): string {
    return OFFICIAL_STAMP_BASE64;
  }

  /**
   * Returns the authorized signature as a Base64 data URI.
   */
  public static getAuthorizedSignatureDataUri(): string {
    return AUTHORIZED_SIGNATURE_BASE64;
  }

  /**
   * Returns the vehicle quotation logo as a Base64 data URI.
   */
  public static getLogoDataUri(): string {
    return LOGO_QUOTATION_BASE64;
  }

  /**
   * Returns all quotation assets ready for embedding into HTML PDF templates.
   */
  public static getAllQuotationImages(): QuotationAssetImages {
    return {
      logoDataUri: LOGO_QUOTATION_BASE64,
      stampDataUri: OFFICIAL_STAMP_BASE64,
      signatureDataUri: AUTHORIZED_SIGNATURE_BASE64,
    };
  }
}
