import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestNavigatorComponent } from './test-navigator.component';
import { PersistenceService } from '../persistence-service/persistence.service';
import { TreeFilterService } from '../tree-filter-service/tree-filter.service';
import { HttpProviderService } from '../http-provider-service/http-provider.service';
import { TreeViewerModule } from '@testeditor/testeditor-commons';
import { PersistenceServiceConfig } from '../persistence-service/persistence.service.config';
import { FilterBarComponent } from '../filter-bar/filter-bar/filter-bar.component';

@NgModule({
  imports: [
    CommonModule, TreeViewerModule
  ],
  declarations: [
    TestNavigatorComponent,
    FilterBarComponent
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
