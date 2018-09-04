export class WorkspaceElement {
  name: string;
  path: string;
  type: ElementType;
  children: WorkspaceElement[];
}

export enum ElementType {
  File = 'file',
  Folder = 'folder'
}
