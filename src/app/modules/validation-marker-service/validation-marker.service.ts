import { WorkspaceElement } from '../persistence-service/workspace-element';
import { ValidationMarkerServiceConfig } from './validation-marker.service.config';
import { Injectable } from '@angular/core';

@Injectable()
export abstract class ValidationMarkerService {
  protected serviceUrl: string;
  constructor(config: ValidationMarkerServiceConfig) {
    this.serviceUrl = config.validationServiceUrl;
  }
  abstract getAllMarkerSummaries(workspaceRoot: WorkspaceElement): Promise<ValidationSummary[]>;
}

export interface ValidationSummary {
  path: string;
  errors: number;
  warnings: number;
  infos: number;
}
