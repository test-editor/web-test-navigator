import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TreeViewerModule } from '@testeditor/testeditor-commons';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { HttpProviderService } from '../http-provider-service/http-provider.service';
import { PersistenceService } from '../persistence-service/persistence.service';
import { PersistenceServiceConfig } from '../persistence-service/persistence.service.config';
import { TreeFilterService } from '../tree-filter-service/tree-filter.service';
import { TestNavigatorComponent } from './test-navigator.component';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import { IndexServiceConfig } from '../index-service/index.service.config';
import { XtextIndexService } from '../index-service/xtext-index.service';
import { IndexService } from '../index-service/index.service';
import { ValidationMarkerServiceConfig } from '../validation-marker-service/validation-marker.service.config';
import { ValidationMarkerService } from '../validation-marker-service/validation-marker.service';
import { XtextDefaultValidationMarkerService } from '../validation-marker-service/xtext-default-validation-marker.service';

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
  static forRoot(persistenceConfig: PersistenceServiceConfig,
                 indexConfig: IndexServiceConfig,
                 validationConfig: ValidationMarkerServiceConfig): ModuleWithProviders {
    return {
      ngModule: TestNavigatorModule,
      providers: [
        PersistenceService,
        { provide: IndexService, useClass: XtextIndexService },
        { provide: ValidationMarkerService, useClass: XtextDefaultValidationMarkerService },
        TreeFilterService,
        HttpProviderService,
        { provide: PersistenceServiceConfig, useValue: persistenceConfig },
        { provide: IndexServiceConfig, useValue: indexConfig },
        { provide: ValidationMarkerServiceConfig, useValue: validationConfig } ]
    };
  }
}
