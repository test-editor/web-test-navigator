import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { TestNavigatorComponent } from './modules/test-navigator/test-navigator.component';
import { MessagingModule } from '@testeditor/messaging-service';
import { HttpProviderService } from './modules/http-provider-service/http-provider.service';
import { PersistenceService } from './modules/persistence-service/persistence.service';
import { PersistenceServiceConfig } from './modules/persistence-service/persistence.service.config';
import { TreeViewerModule } from '@testeditor/testeditor-commons';
import { TreeFilterService } from './modules/tree-filter-service/tree-filter.service';
describe('AppComponent', () => {
  beforeEach(async(() => {
    const persistenceServiceConfig: PersistenceServiceConfig = { persistenceServiceUrl: 'http://example.org' };
    TestBed.configureTestingModule({
      imports: [ MessagingModule.forRoot(), TreeViewerModule ],
      declarations: [
        AppComponent,
        TestNavigatorComponent
      ],
      providers: [ HttpProviderService, TreeFilterService, PersistenceService,
        { provide: PersistenceServiceConfig, useValue: persistenceServiceConfig } ]
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
