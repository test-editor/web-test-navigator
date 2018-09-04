import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestNavigatorComponent } from './test-navigator.component';
import { PersistenceService } from '../persistence-service/persistence.service';
import { TreeFilterService } from '../tree-filter-service/tree-filter.service';
import { HttpProviderService } from '../http-provider-service/http-provider.service';
import { TreeViewerModule } from '@testeditor/testeditor-commons';
import { PersistenceServiceConfig } from '../persistence-service/persistence.service.config';

@NgModule({
  imports: [
    CommonModule, TreeViewerModule
  ],
  declarations: [
    TestNavigatorComponent
  ],
  exports: [
    TestNavigatorComponent
  ]
})
export class TestNavigatorModule {
  static forRoot(persistenceConfig: PersistenceServiceConfig): ModuleWithProviders {
    return {
      ngModule: TestNavigatorModule,
      providers: [PersistenceService, TreeFilterService, HttpProviderService,
        { provide: PersistenceServiceConfig, useValue: persistenceConfig } ]
    };
  }
}
