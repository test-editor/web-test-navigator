import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TreeViewerModule } from '@testeditor/testeditor-commons';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { FilterBarComponent } from '../filter-bar/filter-bar/filter-bar.component';
import { HttpProviderService } from '../http-provider-service/http-provider.service';
import { PersistenceService } from '../persistence-service/persistence.service';
import { PersistenceServiceConfig } from '../persistence-service/persistence.service.config';
import { TreeFilterService } from '../tree-filter-service/tree-filter.service';
import { TestNavigatorComponent } from './test-navigator.component';

@NgModule({
  imports: [
    CommonModule, TreeViewerModule, FormsModule, ButtonsModule.forRoot()
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
