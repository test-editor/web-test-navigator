// all events this components subscribes to and expects to be pushed by other components

export const HTTP_CLIENT_SUPPLIED = 'httpClient.supplied';

export const EDITOR_ACTIVE = 'editor.active';
export const EDITOR_CLOSE = 'editor.close';
export const EDITOR_DIRTY_CHANGED = 'editor.dirtyStateChanged';
export const EDITOR_SAVE_COMPLETED = 'editor.save.completed';

export const WORKSPACE_RELOAD_REQUEST = 'workspace.reload.request';

// test execution was successfully started and is/should be running,
// payload is { response: Response, path: string, message: string }
export const TEST_EXECUTION_STARTED = 'test.execution.started';
// test execution could not be started,
// payload { path: string, reason: any, message: string }
export const TEST_EXECUTION_START_FAILED = 'test.execution.start.failed';
