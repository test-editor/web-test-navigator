import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { TestNavigatorComponent } from './modules/test-navigator/test-navigator.component';
import { MessagingModule } from '@testeditor/messaging-service';
import { HttpProviderService } from './modules/http-provider-service/http-provider.service';
import { PersistenceService } from './modules/persistence-service/persistence.service';
import { PersistenceServiceConfig } from './modules/persistence-service/persistence.service.config';
import { TreeViewerModule } from '@testeditor/testeditor-commons';
import { TreeFilterService } from './modules/tree-filter-service/tree-filter.service';
import { FormsModule } from '@angular/forms';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { FilterBarComponent } from './modules/filter-bar/filter-bar.component';
import { IndexServiceConfig } from './modules/index-service/index.service.config';
import { IndexService } from './modules/index-service/index.service';
import { XtextIndexService } from './modules/index-service/xtext-index.service';
import { TestNavigatorModule } from '../../public_api';
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
        { provide: ValidationMarkerService, useClass: XtextDefaultValidationMarkerService },
        { provide: IndexService, useClass: XtextIndexService },
        { provide: PersistenceServiceConfig, useValue: persistenceServiceConfig },
        { provide: IndexServiceConfig, useValue: indexServiceConfig  },
        { provide: ValidationMarkerServiceConfig, useValue: validationServiceConfig }
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
