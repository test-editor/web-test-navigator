// all events this components pushes for other components to use

export const HTTP_CLIENT_NEEDED = 'httpClient.needed';

export const NAVIGATION_DELETED = 'navigation.deleted';
export const NAVIGATION_CREATED = 'navigation.created';
export const NAVIGATION_RENAMED = 'navigation.renamed';
export const NAVIGATION_OPEN = 'navigation.open';
export const NAVIGATION_SELECT = 'navigation.select';

export const WORKSPACE_OBSERVE = 'workspace.observe'; // ??
export const WORKSPACE_RELOAD_RESPONSE = 'workspace.reload.response';

// test execution was successfully started and is/should be running,
// payload is { response: Response, path: string, message: string }
export const TEST_EXECUTION_STARTED = 'test.execution.started';
// test execution could not be started,
// payload { path: string, reason: any, message: string }
export const TEST_EXECUTION_START_FAILED = 'test.execution.start.failed';
