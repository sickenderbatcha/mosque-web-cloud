/**
 * Death certificate body text.
 * Thin wrapper around the shared configurable certificate body registry.
 */
import {
  CERTIFICATE_BODY_CONFIGS,
  DEATH_CERT_BODY_SETTING_KEY,
  DEATH_CERT_FIELDS,
  DEFAULT_DEATH_CERT_BODY,
  buildDeathCertificateValues,
  getCertificateBodyTemplate,
  getRenderedCertificateBody,
  renderCertificateBody,
  type CertificateBodyField,
} from "@/lib/certificateBody";

export {
  DEATH_CERT_BODY_SETTING_KEY,
  DEATH_CERT_FIELDS,
  DEFAULT_DEATH_CERT_BODY,
  buildDeathCertificateValues,
};

export type DeathCertificateField = CertificateBodyField;

export const renderDeathCertificateBody = (template: string, record: any): string =>
  renderCertificateBody("death", template, record);

export const getDeathCertificateBodyTemplate = (): Promise<string> =>
  getCertificateBodyTemplate("death");

export const getRenderedDeathCertificateBody = (record: any): Promise<string[]> =>
  getRenderedCertificateBody("death", record);

export const DEATH_CERT_CONFIG = CERTIFICATE_BODY_CONFIGS.death;
