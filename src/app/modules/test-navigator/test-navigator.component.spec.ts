import { FormsModule } from '@angular/forms';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { instance, mock, when } from 'ts-mockito/lib/ts-mockito';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import { async, ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { TreeViewerModule, TREE_NODE_SELECTED } from '@testeditor/testeditor-commons';
import { PersistenceServiceConfig } from '../persistence-service/persistence.service.config';
import { HttpProviderService } from '../http-provider-service/http-provider.service';
import { PersistenceService } from '../persistence-service/persistence.service';
import { MessagingModule, MessagingService } from '@testeditor/messaging-service';
import { TreeFilterService } from '../tree-filter-service/tree-filter.service';
import { TestNavigatorComponent } from './test-navigator.component';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { ElementType } from '../persistence-service/workspace-element';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { TEST_EXECUTION_STARTED, TEST_EXECUTION_START_FAILED } from '../event-types-in';

describe('TestNavigatorComponent', () => {
  let component: TestNavigatorComponent;
  let fixture: ComponentFixture<TestNavigatorComponent>;
  let messagingService: MessagingService;
  let sidenav: DebugElement;

  beforeEach(async(() => {
    const mockPersistenceService = mock(PersistenceService);
    when(mockPersistenceService.listFiles()).thenResolve({
      name: 'root', path: 'src/test/java', type: ElementType.Folder, children: [
        {name: 'test.tcl', path: 'src/test/java/test.tcl', type: ElementType.File, children: []},
        {name: 'test.tsl', path: 'src/test/java/test.tsl', type: ElementType.File, children: []}
    ]});
    TestBed.configureTestingModule({
      imports: [ TreeViewerModule, MessagingModule.forRoot(), FormsModule, ButtonsModule.forRoot() ],
      declarations: [ TestNavigatorComponent, FilterBarComponent ],
      providers: [ HttpProviderService, TreeFilterService,
        { provide: PersistenceService, useValue: instance(mockPersistenceService) } ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestNavigatorComponent);
    component = fixture.componentInstance;
    messagingService = TestBed.get(MessagingService);
    fixture.detectChanges();
    sidenav = fixture.debugElement.query(By.css('.sidenav'));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('updates filter state on event from filter-bar child component', async () => {
    // given
    const tslFilterButton = fixture.debugElement.query(By.css('#filter-bar > label')).nativeElement;
    await component.updateModel();
    const tslFile = component.model.children[1]; expect(tslFile.name).toEqual('test.tsl');
    const tclFile = component.model.children[0]; expect(tclFile.name).toEqual('test.tcl');

    // when
    tslFilterButton.click();

    // then
    expect(tslFile.cssClasses).not.toContain('hidden');
    expect(tclFile.cssClasses).toContain('hidden');
  });

  it('updates the UI state when an "navigation.select" event is received and it is a (executable) tcl', fakeAsync(() => {
    // given
    const tclFile: TestNavigatorTreeNode = new TestNavigatorTreeNode(
      { name: 'my test', path: 'my/test.tcl', type: ElementType.File, children: [ ] });
    component.model = tclFile;

    // when
    messagingService.publish(TREE_NODE_SELECTED, tclFile);
    tick();

    // then
    expect(component.selectionIsExecutable()).toBeTruthy();
  }));

  it('updates the UI state when an "navigation.select" event is received and it is a (non executable) aml', fakeAsync(() => {
    // given
    const tclFile: TestNavigatorTreeNode = new TestNavigatorTreeNode(
      { name: 'my aml', path: 'my/test.aml', type: ElementType.File, children: [ ] });
    component.model = tclFile;

    // when
    messagingService.publish(TREE_NODE_SELECTED, tclFile);
    tick();

    // then
    expect(component.selectionIsExecutable()).toBeFalsy();
  }));

  it('publishes test execution request for currently selected test file when "run" button is clicked', fakeAsync(() => {
    // given
    const tclFile: TestNavigatorTreeNode = new TestNavigatorTreeNode(
      { name: 'my test', path: 'my/test.tcl', type: ElementType.File, children: [ ] });
    component.model = tclFile;
    component.select(tclFile);
    fixture.detectChanges();
    const runIcon = sidenav.query(By.css('#run'));
    const testExecCallback = jasmine.createSpy('testExecCallback');
    messagingService.subscribe('test.execute.request', testExecCallback);

    // when
    runIcon.nativeElement.click();
    tick();

    // then
    expect(testExecCallback).toHaveBeenCalledTimes(1);
    expect(testExecCallback).toHaveBeenCalledWith(tclFile.id);
  }));

  it('disables the run button when selecting a non-executable file', async(() => {
    // given
    const amlFile: TestNavigatorTreeNode = new TestNavigatorTreeNode(
      { name: 'my aml', path: 'my/test.aml', type: ElementType.File, children: [ ] });
    component.model = amlFile;
    component.select(amlFile);
    fixture.detectChanges();
    const runIcon = sidenav.query(By.css('#run'));

    // when
    component.select(amlFile);

    // then
    fixture.whenStable().then(() => {
      expect(runIcon.properties['disabled']).toBeTruthy();
    });
  }));

  it('initially disables the run button', async(() => {
    // given
    const tclFile: TestNavigatorTreeNode = new TestNavigatorTreeNode(
      { name: 'my test', path: 'my/test.tcl', type: ElementType.File, children: [ ] });
    component.model = tclFile;
    fixture.detectChanges();
    const runIcon = sidenav.query(By.css('#run'));

    // when

    // then
    expect(runIcon.properties['disabled']).toBeTruthy();
  }));

  it('displays notification when receiving the test execution started event', fakeAsync(() => {
    // given

    // when
    messagingService.publish(TEST_EXECUTION_STARTED, { message: 'Execution of "\${}" has been started.', path: 'some.tcl' });
    tick();

    // then
    fixture.detectChanges();
    const notify = fixture.debugElement.query(By.css('#notification'));
    expect(notify).toBeTruthy();
    expect(component.notification).toEqual(`Execution of "some.tcl" has been started.`);
    expect(notify.nativeElement.innerText).toEqual(component.notification);

    flush();
  }));

  it('removes notification sometime after test execution has been started', fakeAsync(() => {
    // given

    // when
    messagingService.publish(TEST_EXECUTION_STARTED, { message: 'some message', path: 'some.tcl' });
    tick(TestNavigatorComponent.NOTIFICATION_TIMEOUT_MILLIS);

    // then
    const notify = fixture.debugElement.query(By.css('#notification'));
    expect(notify).toBeFalsy();
    expect(component.notification).toBeFalsy();
  }));

  it('displays error message when test execution could not be started', fakeAsync(() => {
    // given

    // when
    messagingService.publish(TEST_EXECUTION_START_FAILED, { message: 'The test "\${}" could not be started.', path: 'some.tcl' });
    tick();

    // then
    fixture.detectChanges();
    const notify = fixture.debugElement.query(By.css('#notification'));
    expect(notify).toBeFalsy();

    const alert = fixture.debugElement.query(By.css('#errorMessage'));
    expect(alert).toBeTruthy();
    expect(component.errorMessage).toEqual(`The test "some.tcl" could not be started.`);
    expect(alert.nativeElement.innerText).toEqual(component.errorMessage);

    flush();
  }));

});
