import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SystemSettings } from '../domain/models.ts';
import { settingsService } from '../services/systemService.ts';
import { SITE } from './site-config.ts';

/**
 * Company details, read once and shared.
 *
 * `site-config.ts` holds build-time placeholders so a fresh checkout renders
 * something; anything saved in Settings overrides it. That way the footer,
 * the legal pages and the invoice all show the same details, and changing
 * them is a form rather than a deploy.
 */
export interface Branding {
  productName: string;
  legalName: string;
  registrationNumber: string;
  address: string;
  email: string;
  phone: string;
  /** False while the details are still placeholders. */
  complete: boolean;
  settings: SystemSettings | null;
  reload: () => Promise<void>;
}

const BrandingContext = createContext<Branding | null>(null);

function isFilled(value: string | undefined): value is string {
  return Boolean(value && value.trim() && !value.trim().startsWith('['));
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const reload = useCallback(async () => {
    try {
      setSettings(await settingsService.get());
    } catch {
      // The settings document is public to read, but a network failure must
      // not blank the footer — the placeholders below still render.
      setSettings(null);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<Branding>(() => {
    const legalName = isFilled(settings?.companyLegalName)
      ? settings!.companyLegalName!
      : SITE.legalName;
    const registrationNumber = isFilled(settings?.companyRegistrationNumber)
      ? settings!.companyRegistrationNumber!
      : SITE.registrationNumber;
    const address = isFilled(settings?.companyAddress) ? settings!.companyAddress! : SITE.address;
    const email = isFilled(settings?.supportEmail) ? settings!.supportEmail! : SITE.email;

    return {
      productName: settings?.brandName || SITE.productName,
      legalName,
      registrationNumber,
      address,
      email,
      phone: settings?.supportPhone || SITE.phone || '',
      complete: [legalName, registrationNumber, address, email].every(isFilled),
      settings,
      reload,
    };
  }, [settings, reload]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export function useBranding(): Branding {
  const context = useContext(BrandingContext);
  if (!context) throw new Error('useBranding must be used inside a BrandingProvider');
  return context;
}
