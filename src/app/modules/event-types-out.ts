// all events this components pushes for other components to use

export const HTTP_CLIENT_NEEDED = 'httpClient.needed';

export const NAVIGATION_DELETED = 'navigation.deleted';
export const NAVIGATION_CREATED = 'navigation.created';
export const NAVIGATION_RENAMED = 'navigation.renamed';
export const NAVIGATION_OPEN = 'navigation.open';
export const NAVIGATION_SELECT = 'navigation.select';

export const WORKSPACE_RELOAD_RESPONSE = 'workspace.reload.response';

export const WORKSPACE_RETRIEVED = 'workspace.retrieved';
export const WORKSPACE_RETRIEVED_FAILED = 'workspace.retrieved.failed';

// request execution of a test case,
// payload is the absolute path of the respective tcl
export const TEST_EXECUTE_REQUEST = 'test.execute.request';
