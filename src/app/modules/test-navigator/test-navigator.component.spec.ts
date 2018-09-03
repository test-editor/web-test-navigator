import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { TestNavigatorComponent } from './test-navigator.component';
import { TreeViewerModule } from '@testeditor/testeditor-commons';
import { PersistenceService } from '../persistence-service/persistence.service';
import { PersistenceServiceConfig } from '../persistence-service/persistence.service.config';
import { HttpProviderService } from '../http-provider-service/http-provider.service';
import { MessagingModule } from '@testeditor/messaging-service';
import { TreeFilterService } from '../tree-filter-service/tree-filter.service';

describe('TestNavigatorComponent', () => {
  let component: TestNavigatorComponent;
  let fixture: ComponentFixture<TestNavigatorComponent>;

  beforeEach(async(() => {
    const persistenceServiceConfig: PersistenceServiceConfig = { persistenceServiceUrl: 'http://example.org' };
    TestBed.configureTestingModule({
      imports: [ TreeViewerModule, MessagingModule.forRoot() ],
      declarations: [ TestNavigatorComponent ],
      providers: [ HttpProviderService, TreeFilterService, PersistenceService,
        { provide: PersistenceServiceConfig, useValue: persistenceServiceConfig } ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestNavigatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
