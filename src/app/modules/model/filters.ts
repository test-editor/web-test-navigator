import { TreeNode } from '@testeditor/testeditor-commons';
import { TestNavigatorTreeNode } from './test-navigator-tree-node';
import { ElementType } from '../persistence-service/workspace-element';
import { FilterState } from '../filter-bar/filter-bar.component';

  export type Filter = (node: TreeNode) => boolean;

  const tslFileRegex = /.+\.tsl$/i;
  const tclFileRegex = /.+\.tcl$/i;
  const configFileRegex = /.+\.config$/i;
  const tmlFileRegex = /.+\.tml$/i;
  const amlFileRegex = /.+\.aml$/i;

  export const testNavigatorFilter = (node: TreeNode) =>
    (node as TestNavigatorTreeNode).type === ElementType.Folder || isTestEditorFile(node.id);

  export function isTestEditorFile(path: string) {
    return isTslFile(path) || isTclFile(path) || isConfigFile(path) || isTmlFile(path) || isAmlFile(path); }

  export function filterFor(state: FilterState, node: TestNavigatorTreeNode): boolean {
    return node.type === ElementType.Folder || (
      ( !(state.tsl || state.tcl || state.aml) && isTestEditorFile(node.id)) ) || (
      ( state.tsl && isTslFile(node.id) ) ||
      ( state.tcl && (isTclFile(node.id) || isConfigFile(node.id) || isTmlFile(node.id)) ) ||
      ( state.aml && isAmlFile(node.id) )
    );
  }

  export function isTslFile(path: string): boolean { return tslFileRegex.test(path); }
  export function isTclFile(path: string): boolean { return tclFileRegex.test(path); }
  export function isTmlFile(path: string): boolean { return tmlFileRegex.test(path); }
  export function isConfigFile(path: string): boolean { return configFileRegex.test(path); }
  export function isAmlFile(path: string): boolean { return amlFileRegex.test(path); }
