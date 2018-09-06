import { WorkspaceElement } from '../persistence-service/workspace-element';

export abstract class ValidationMarkerService {
  abstract getAllMarkerSummaries(workspaceRoot: WorkspaceElement): Promise<ValidationSummary[]>;
}

export interface ValidationSummary {
  path: string;
  errors: number;
  warnings: number;
  infos: number;
}
