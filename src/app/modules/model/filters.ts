import { TreeNode } from '@testeditor/testeditor-commons';
import { TestNavigatorTreeNode } from './test-navigator-tree-node';
import { ElementType } from '../persistence-service/workspace-element';
import { FilterState, FilterType } from '../filter-bar/filter-bar.component';

export type Filter = (node: TreeNode) => boolean;

const tslFileRegex = /.+\.tsl$/i;
const tclFileRegex = /.+\.tcl$/i;
const configFileRegex = /.+\.config$/i;
const testframeFileRegex = /.+\.tfr$/i;
const tmlFileRegex = /.+\.tml$/i;
const amlFileRegex = /.+\.aml$/i;
const dataFileRegex = /.+\.(csv|json|yaml)$/i;

export function validExtensions(): string[] {
  return ['tsl', 'tcl', 'config', 'tfr', 'tml', 'aml', 'csv', 'json', 'yaml'];
}

export const testNavigatorFilter = (node: TreeNode) =>
  (node as TestNavigatorTreeNode).type === ElementType.Folder || isTestEditorFile(node.id);

export function isTestEditorFile(path: string) {
  return isTslFile(path) || isTclFile(path) || isConfigFile(path) || isTmlFile(path) || isAmlFile(path) || isDataFile(path); }

export function filterFor(state: FilterState, node: {type: ElementType, id: string}): boolean {
  return node.type === ElementType.Folder || (
    ( !(state.tsl || state.tcl || state.aml) && isTestEditorFile(node.id)) ) || (
      ( state.tsl && isTslFile(node.id) ) ||
        ( state.tcl && (isTclFile(node.id) || isConfigFile(node.id) || isTmlFile(node.id) || isDataFile(node.id)) ) ||
        ( state.aml && isAmlFile(node.id) )
    );
}

export function isFileOfType(path: string, type: FilterType): boolean {
  switch (type) {
    case 'tsl': return isTslFile(path);
    case 'tcl': return isTclFile(path) || isConfigFile(path) || isTmlFile(path) || isDataFile(path);
    case 'aml': return isAmlFile(path);
  }
}

export function isTslFile(path: string): boolean { return tslFileRegex.test(path); }
export function isTclFile(path: string): boolean { return tclFileRegex.test(path); }
export function isTmlFile(path: string): boolean { return tmlFileRegex.test(path); }
export function isConfigFile(path: string): boolean { return configFileRegex.test(path) || testframeFileRegex.test(path); }
export function isAmlFile(path: string): boolean { return amlFileRegex.test(path); }
export function isDataFile(path: string): boolean { return dataFileRegex.test(path); }
