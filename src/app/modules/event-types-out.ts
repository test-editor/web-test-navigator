// all events this components pushes for other components to use

export const HTTP_CLIENT_NEEDED = 'httpClient.needed';

export const NAVIGATION_DELETED = 'navigation.deleted';
export const NAVIGATION_CREATED = 'navigation.created';
export const NAVIGATION_RENAMED = 'navigation.renamed';
export interface NavigationRenamedPayload {
  oldPath: string;
  newPath: string;
}


export const NAVIGATION_OPEN = 'navigation.open';
export const NAVIGATION_SELECT = 'navigation.select';

export const WORKSPACE_RELOAD_RESPONSE = 'workspace.reload.response';

export const WORKSPACE_RETRIEVED = 'workspace.retrieved';
export const WORKSPACE_RETRIEVED_FAILED = 'workspace.retrieved.failed';

// payload is the selected TreeNode (must be a tcl)
export const TEST_SELECTED = 'test.selected';

export interface SnackbarMessage {
  message: string;
  timeout?: number;
}
export const SNACKBAR_DISPLAY_NOTIFICATION = 'snackbar.display.notification';

// payload is string (path/id of resource)
export const EDITOR_RELOAD = 'editor.reload';
