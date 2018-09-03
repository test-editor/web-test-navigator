import { Component, OnInit } from '@angular/core';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { PersistenceService } from '../persistence-service/persistence.service';
import { TreeFilterService } from '../tree-filter-service/tree-filter.service';
import { TreeViewerConfig, TreeNode } from '@testeditor/testeditor-commons';

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
    this.model = await this.filteredTreeService.listTestFiles();
  }

}
