import { Component, OnInit } from '@angular/core';
import { TreeNode, TreeViewerConfig } from '@testeditor/testeditor-commons';
import { testNavigatorFilter } from '../model/filters';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { TreeFilterService } from '../tree-filter-service/tree-filter.service';

@Component({
  selector: 'app-test-navigator',
  templateUrl: './test-navigator.component.html',
  styleUrls: ['./test-navigator.component.css']
})
export class TestNavigatorComponent implements OnInit {
  model: TestNavigatorTreeNode;
  treeConfig: TreeViewerConfig = {
    onClick: () => null,
    onDoubleClick: (node: TreeNode) => node.expanded = !node.expanded,
    onIconClick: (node: TreeNode) => node.expanded = !node.expanded
  };

  constructor(private filteredTreeService: TreeFilterService) { }

  ngOnInit() {
    this.updateModel();
  }

  async updateModel(): Promise<void> {
    console.log('retrieving test file tree...');
    this.model = (await this.filteredTreeService.listTreeNodes())
      .forEach((node) => (node as TestNavigatorTreeNode).show(testNavigatorFilter(node)) );
  }

}
