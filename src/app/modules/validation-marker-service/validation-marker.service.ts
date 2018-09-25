import { WorkspaceElement } from '../persistence-service/workspace-element';
import { ValidationMarkerServiceConfig } from './validation-marker.service.config';
import { Injectable } from '@angular/core';
import { ValidationMarkerData } from '../validation-marker-summary/validation-marker-summary';

@Injectable()
export abstract class ValidationMarkerService {
  protected serviceUrl: string;
  constructor(config: ValidationMarkerServiceConfig) {
    this.serviceUrl = config.validationServiceUrl;
  }
  abstract getAllMarkerSummaries(): Promise<Map<string, ValidationMarkerData>>;
}

export interface ValidationSummary extends ValidationMarkerData {
  path: string;
}
