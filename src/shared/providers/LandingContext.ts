/**
 * Landing Context — Separated for fast refresh
 * Isolation of Context creation from Provider component
 */

import React from "react";
import { ILandingContentService } from "@/domains/landing/services/LandingContentService";

interface LandingContextType {
  contentService: ILandingContentService;
}

export const LandingContext = React.createContext<LandingContextType | undefined>(
  undefined
);

export function useLandingContent(): ILandingContentService {
  const context = React.useContext(LandingContext);

  if (!context) {
    throw new Error(
      "useLandingContent deve ser utilizado dentro de um <LandingProvider>"
    );
  }

  return context.contentService;
}
