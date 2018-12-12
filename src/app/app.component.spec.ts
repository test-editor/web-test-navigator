import { async, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MessagingModule } from '@testeditor/messaging-service';
import { HttpProviderService, IndicatorFieldSetup, TreeViewerModule } from '@testeditor/testeditor-commons';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { AppComponent } from './app.component';
import { FilterBarComponent } from './modules/filter-bar/filter-bar.component';
import { IndexService } from './modules/index-service/index.service';
import { IndexServiceConfig } from './modules/index-service/index.service.config';
import { XtextIndexService } from './modules/index-service/xtext-index.service';
import { PersistenceService } from './modules/persistence-service/persistence.service';
import { PersistenceServiceConfig } from './modules/persistence-service/persistence.service.config';
import { DefaultUserActivityLabelProvider } from './modules/style-provider/user-activity-label-provider';
import { DefaultUserActivityStyleProvider } from './modules/style-provider/user-activity-style-provider';
import { FilenameValidator } from './modules/test-navigator/filename-validator';
import { TestNavigatorFieldSetup, TEST_NAVIGATOR_USER_ACTIVITY_LABEL_PROVIDER,
  TEST_NAVIGATOR_USER_ACTIVITY_STYLE_PROVIDER,
  TEST_NAVIGATOR_USER_ACTIVITY_LIST} from './modules/test-navigator/test-navigator-field-setup';
import { TestNavigatorComponent } from './modules/test-navigator/test-navigator.component';
import { TreeFilterService } from './modules/tree-filter-service/tree-filter.service';
import { ValidationMarkerService } from './modules/validation-marker-service/validation-marker.service';
import { ValidationMarkerServiceConfig } from './modules/validation-marker-service/validation-marker.service.config';
import { XtextDefaultValidationMarkerService } from './modules/validation-marker-service/xtext-default-validation-marker.service';

describe('AppComponent', () => {
  beforeEach(async(() => {
    const persistenceServiceConfig: PersistenceServiceConfig = { persistenceServiceUrl: 'http://example.org' };
    const indexServiceConfig: IndexServiceConfig = { indexServiceUrl: 'http://index.example.org' };
    const validationServiceConfig: ValidationMarkerServiceConfig = { validationServiceUrl: 'http://validation.example.org' };
    TestBed.configureTestingModule({
      imports: [
        MessagingModule.forRoot(),
        TreeViewerModule,
        FormsModule,
        ButtonsModule.forRoot()
      ],
      declarations: [
        AppComponent, TestNavigatorComponent, FilterBarComponent
      ],
      providers: [
        HttpProviderService,
        TreeFilterService,
        PersistenceService,
        FilenameValidator,
        { provide: ValidationMarkerService, useClass: XtextDefaultValidationMarkerService },
        { provide: IndexService, useClass: XtextIndexService },
        { provide: PersistenceServiceConfig, useValue: persistenceServiceConfig },
        { provide: IndexServiceConfig, useValue: indexServiceConfig  },
        { provide: ValidationMarkerServiceConfig, useValue: validationServiceConfig },
        { provide: IndicatorFieldSetup, useClass: TestNavigatorFieldSetup },
        { provide: TEST_NAVIGATOR_USER_ACTIVITY_STYLE_PROVIDER, useClass: DefaultUserActivityStyleProvider },
        { provide: TEST_NAVIGATOR_USER_ACTIVITY_LABEL_PROVIDER, useClass: DefaultUserActivityLabelProvider },
        { provide: TEST_NAVIGATOR_USER_ACTIVITY_LIST, useValue: [] }
      ]
    }).compileComponents();
  }));

  it('should create the app', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));

  it(`should have as title 'app'`, async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('app');
  }));

  it('should render title in a h1 tag', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('h1').textContent).toContain('Welcome to app!');
  }));

});
