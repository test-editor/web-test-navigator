import { async, ComponentFixture, fakeAsync, flush, TestBed, tick, inject } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { MessagingModule, MessagingService } from '@testeditor/messaging-service';
import { IndicatorFieldSetup, TreeViewerModule } from '@testeditor/testeditor-commons';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { instance, mock, when, verify, anyString, anything } from 'ts-mockito/lib/ts-mockito';
import { TEST_EXECUTION_STARTED, TEST_EXECUTION_START_FAILED } from '../event-types-in';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import { HttpProviderService } from '../http-provider-service/http-provider.service';
import { IndexService } from '../index-service/index.service';
import { PersistenceService } from '../persistence-service/persistence.service';
import { ElementType } from '../persistence-service/workspace-element';
import { TreeFilterService } from '../tree-filter-service/tree-filter.service';
import { ValidationMarkerService } from '../validation-marker-service/validation-marker.service';
import { FilenameValidator } from './filename-validator';
import { TestNavigatorFieldSetup } from './test-navigator-field-setup';
import { TestNavigatorComponent } from './test-navigator.component';
import { ValidationMarkerData } from '../validation-marker-summary/validation-marker-summary';
import { XtextDefaultValidationMarkerService } from '../validation-marker-service/xtext-default-validation-marker.service';
import { XtextIndexService } from '../index-service/xtext-index.service';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';

describe('TestNavigatorComponent', () => {
  let component: TestNavigatorComponent;
  let fixture: ComponentFixture<TestNavigatorComponent>;
  let mockFilenameValidator: FilenameValidator;
  let mockPersistenceService: PersistenceService;
  let mockValidationService: ValidationMarkerService;

  beforeEach(async(() => {
    mockPersistenceService = mock(PersistenceService);
    const mockIndexService = mock(XtextIndexService);
    mockValidationService = mock(XtextDefaultValidationMarkerService);
    const validationMarkerMap = new Map<string, ValidationMarkerData>();
    validationMarkerMap.set('src/test/java/test.tcl', {errors: 1, warnings: 2, infos: 3});
    validationMarkerMap.set('src/test/java/test.tsl', {errors: 0, warnings: 1, infos: 2});
    when(mockValidationService.getAllMarkerSummaries()).thenResolve(validationMarkerMap);
    when(mockIndexService.refresh()).thenResolve([]);

    mockFilenameValidator = mock(FilenameValidator);
    when(mockFilenameValidator.isValidName(anyString(), anything())).thenReturn(true);
    when(mockPersistenceService.listFiles()).thenResolve({
      name: 'root', path: 'src/test/java', type: ElementType.Folder, children: [
        {name: 'test.tcl', path: 'src/test/java/test.tcl', type: ElementType.File, children: []},
        {name: 'test.tsl', path: 'src/test/java/test.tsl', type: ElementType.File, children: []},
        {name: 'subfolder', path: 'src/test/java/subfolder', type: ElementType.Folder, children: []}
    ]});
    when(mockPersistenceService.deleteResource(anyString())).thenResolve('');
    when(mockPersistenceService.renameResource(anyString(), anyString())).thenResolve('');
    when(mockPersistenceService.createResource(anyString(), anything())).thenResolve('');
    TestBed.configureTestingModule({
      imports: [ TreeViewerModule, MessagingModule.forRoot(), FormsModule, ButtonsModule.forRoot() ],
      declarations: [ TestNavigatorComponent, FilterBarComponent ],
      providers: [ HttpProviderService, TreeFilterService,
                   { provide: FilenameValidator, useValue: instance(mockFilenameValidator) },
                   { provide: PersistenceService, useValue: instance(mockPersistenceService) },
                   { provide: IndexService, useValue: instance(mockIndexService) },
                   { provide: ValidationMarkerService, useValue: instance(mockValidationService) },
                   { provide: IndicatorFieldSetup, useClass: TestNavigatorFieldSetup } ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestNavigatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function clickDeleteAndConfirmOnFirstNode() {
    const deleteButton = fixture.debugElement.query(By.css('.embedded-delete-button'));
    deleteButton.nativeElement.click();
    fixture.detectChanges();
    const confirmButton = fixture.debugElement.query(By.css('.confirm-action-confirm-button'));
    confirmButton.nativeElement.click();
    tick(); fixture.detectChanges();
  }

  function selectFirstElementClickRenameEnterTextAndHitEnter(newName: string) {
    const firstNode = fixture.debugElement.query(By.css('.tree-view .tree-view .tree-view-item-key'));
    const renameButton = fixture.debugElement.query(By.css('#rename'));
    firstNode.nativeElement.click(); fixture.detectChanges();
    renameButton.nativeElement.click(); fixture.detectChanges();
    const inputBox = fixture.debugElement.query(By.css('.navInputBox > input'));
    inputBox.nativeElement.value = newName;
    inputBox.triggerEventHandler('keyup.enter', {});
    tick(); fixture.detectChanges();
  }

  function selectFirstElementClickNewFileEnterTextAndHitEnter(newName: string) {
    const firstNode = fixture.debugElement.query(By.css('.tree-view .tree-view .tree-view-item-key'));
    const newFileButton = fixture.debugElement.query(By.css('#new-file'));
    firstNode.nativeElement.click(); fixture.detectChanges();
    newFileButton.nativeElement.click(); fixture.detectChanges();
    const inputBox = fixture.debugElement.query(By.css('.navInputBox > input'));
    inputBox.nativeElement.value = newName;
    inputBox.triggerEventHandler('keyup.enter', {});
    tick(); fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('updates filter state on event from filter-bar child component', async () => {
    // given
    const tslFilterButton = fixture.debugElement.query(By.css('#filter-bar > label')).nativeElement;
    await component.updateModel();
    const tslFile = component.model.children[2]; expect(tslFile.name).toEqual('test.tsl');
    const tclFile = component.model.children[1]; expect(tclFile.name).toEqual('test.tcl');

    // when
    tslFilterButton.click();

    // then
    expect(tslFile.cssClasses).not.toContain('hidden');
    expect(tclFile.cssClasses).toContain('hidden');
  });

  it('validates the input using FilenameValidator during a new element request', async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();
    const newFileButton = fixture.debugElement.query(By.css('#new-file'));
    const contextElement = fixture.debugElement.query(By.css('.tree-view-item-key'));
    contextElement.nativeElement.click(); fixture.detectChanges();
    newFileButton.nativeElement.click(); fixture.detectChanges();
    const inputBox = fixture.debugElement.query(By.css('.navInputBox > input'));
    inputBox.nativeElement.value = 'newElementName';

    // when
    inputBox.triggerEventHandler('keyup', {});

    // then
    verify(mockFilenameValidator.isValidName('newElementName', ElementType.File)).called();
    expect().nothing();
  });

  it('disables rename button when root element is selected', async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();
    const renameButton = fixture.debugElement.query(By.css('#rename'));
    const root = fixture.debugElement.query(By.css('.tree-view-item-key'));

    // when
    root.nativeElement.click(); fixture.detectChanges();

    // then
    expect(renameButton.nativeElement.disabled).toBeTruthy();
  });

  it('disables rename button when selection is dirty', async () => {
    // given
    await component.updateModel();
    component.model.expanded = true;
    component.model.children[1].dirty = true;
    fixture.detectChanges();
    const renameButton = fixture.debugElement.query(By.css('#rename'));
    const testNode = fixture.debugElement.query(By.css('app-tree-viewer > div > div:nth-child(2) > div:nth-child(2) .tree-view-item-key'));

    // when
    testNode.nativeElement.click(); fixture.detectChanges();

    // then
    expect(renameButton.nativeElement.disabled).toBeTruthy();
    expect(renameButton.nativeElement['title']).toEqual('cannot rename "test.tcl": unsaved changes');
  });

  it('removes element whose delete button was clicked from the tree, after user confirmed and backend responds with success',
    fakeAsync(async () => {
    // given
    await component.updateModel();
    const elementBeingDeleted = component.model.children[1];
    component.model.expanded = true;
    fixture.detectChanges();

    // when
    clickDeleteAndConfirmOnFirstNode();

    // then
    expect(component.model.children.length).toEqual(2);
    expect(component.model.children[1].name).not.toEqual(elementBeingDeleted.name);
  }));

  it('retains element whose delete button was clicked from the tree, if user confirmed but backend responded with failure',
    fakeAsync(async () => {
    // given
    when(mockPersistenceService.deleteResource(anyString())).thenReject(new Error('deletion unsuccessul'));
    await component.updateModel();
    const elementFailingToBeDeleted = component.model.children[1];
    component.model.expanded = true;
    fixture.detectChanges();

    // when
    clickDeleteAndConfirmOnFirstNode();

    // then
    expect(component.model.children.length).toEqual(3);
    expect(component.model.children[1].name).toEqual(elementFailingToBeDeleted.name);
    expect(fixture.debugElement.query(By.css('#errorMessage')).nativeElement.innerText).toEqual('Error while deleting element!');
    flush();
  }));

  it('retrieves and sets validation markers during initialization', fakeAsync( async () => {
    // given + when
    await component.updateModel();
    tick(); fixture.detectChanges();

    // then
    const tslFile = component.model.children[1];
    const tclFile = component.model.children[0];
    expect(tclFile.validation).toEqual(jasmine.objectContaining({errors: 1, warnings: 2, infos: 3}));
    expect(tslFile.validation).toEqual(jasmine.objectContaining({errors: 0, warnings: 1, infos: 2}));
    expect(component.model.validation).toEqual(jasmine.objectContaining({errors: 1, warnings: 3, infos: 5}));

    const errorMarker = fixture.debugElement.query(By.css('.validation-errors'));
    expect(errorMarker.nativeElement.title).toEqual('1 error(s), 2 warning(s), 3 info(s)');
    const warningMarker = fixture.debugElement.query(By.css('.validation-warnings'));
    expect(warningMarker.nativeElement.title).toEqual('1 warning(s), 2 info(s)');
  }));

  it('lets a validation marker appear on a folder when it is collapsed and its children have markers', fakeAsync( async () => {
    // given
    await component.updateModel();

    // when
    component.model.expanded = false;
    tick(); fixture.detectChanges();

    // then
    const errorMarker = fixture.debugElement.query(By.css('.validation-errors'));
    expect(errorMarker.nativeElement.title).toEqual('1 error(s), 3 warning(s), 5 info(s)');
  }));

  it('updates validation markers after a deletion', fakeAsync(async () => {
    // given
    await component.updateModel();
    component.model.expanded = true;
    fixture.detectChanges();

    const validationMarkerMap = new Map<string, ValidationMarkerData>();
    validationMarkerMap.set('src/test/java/test.tsl', {errors: 23, warnings: 42, infos: 3});
    when(mockValidationService.getAllMarkerSummaries()).thenResolve(validationMarkerMap);

    // when
    clickDeleteAndConfirmOnFirstNode();

    // then
    expect(component.model.validation).toEqual(jasmine.objectContaining({errors: 23, warnings: 42, infos: 3}));
    expect(component.model.children[0].validation).toEqual(jasmine.objectContaining({errors: 23, warnings: 42, infos: 3}));
  }));

  it('updates validation markers after a rename', fakeAsync(async () => {
    // given
    await component.updateModel();
    component.model.expanded = true;
    fixture.detectChanges();

    const validationMarkerMap = new Map<string, ValidationMarkerData>();
    validationMarkerMap.set('src/test/java/renamed.tcl', {errors: 3, warnings: 4, infos: 5});
    validationMarkerMap.set('src/test/java/test.tsl', {errors: 0, warnings: 1, infos: 2});
    when(mockValidationService.getAllMarkerSummaries()).thenResolve(validationMarkerMap);

    // when
    selectFirstElementClickRenameEnterTextAndHitEnter('renamed.tcl');

    // then
    expect(component.model.validation).toEqual(jasmine.objectContaining({errors: 3, warnings: 5, infos: 7}));
    expect(component.model.children[0].validation).toEqual(jasmine.objectContaining({errors: 3, warnings: 4, infos: 5}));
    expect(component.model.children[1].validation).toEqual(jasmine.objectContaining({errors: 0, warnings: 1, infos: 2}));
  }));

  it('updates validation markers after a node is added', fakeAsync(async () => {
    // given
    await component.updateModel();
    component.model.expanded = true;
    fixture.detectChanges();

    const validationMarkerMap = new Map<string, ValidationMarkerData>();
    validationMarkerMap.set('src/test/java/newFile.tcl', {errors: 6, warnings: 4, infos: 2});
    validationMarkerMap.set('src/test/java/test.tcl', {errors: 3, warnings: 4, infos: 5});
    validationMarkerMap.set('src/test/java/test.tsl', {errors: 0, warnings: 1, infos: 2});
    when(mockValidationService.getAllMarkerSummaries()).thenResolve(validationMarkerMap);

    // when
    selectFirstElementClickNewFileEnterTextAndHitEnter('newFile.tcl');

    // then
    expect(component.model.validation).toEqual(jasmine.objectContaining({errors: 9, warnings: 9, infos: 9}));
    expect(component.model.children[0].validation).toEqual(jasmine.objectContaining({errors: 6, warnings: 4, infos: 2}));
    expect(component.model.children[1].validation).toEqual(jasmine.objectContaining({errors: 3, warnings: 4, infos: 5}));
    expect(component.model.children[2].validation).toEqual(jasmine.objectContaining({errors: 0, warnings: 1, infos: 2}));
  }));

  it('updates validation markers when an open file is saved', fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
    // given
    await component.updateModel();
    component.model.expanded = true;
    fixture.detectChanges();
    const firstNode = fixture.debugElement.query(By.css('.tree-view .tree-view .tree-view-item-key'));

    const validationMarkerMap = new Map<string, ValidationMarkerData>();
    validationMarkerMap.set('src/test/java/test.tcl', {errors: 3, warnings: 4, infos: 5});
    validationMarkerMap.set('src/test/java/test.tsl', {errors: 0, warnings: 1, infos: 2});
    when(mockValidationService.getAllMarkerSummaries()).thenResolve(validationMarkerMap);

    firstNode.triggerEventHandler('dblclick', new MouseEvent('dblclick'));
    tick(); fixture.detectChanges();

    // when
    messageBus.publish('editor.save.completed', {});
    tick();

    // then
    expect(component.model.validation).toEqual(jasmine.objectContaining({errors: 3, warnings: 5, infos: 7}));
    expect(component.model.children[0].validation).toEqual(jasmine.objectContaining({errors: 3, warnings: 4, infos: 5}));
    expect(component.model.children[1].validation).toEqual(jasmine.objectContaining({errors: 0, warnings: 1, infos: 2}));
  })));


  it('activates cut and copy button if the selection is a file', async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();

    // when
    component.select(component.model.children[0]);
    fixture.detectChanges();

    // then
    const cutButton = fixture.debugElement.query(By.css('#cut')).nativeElement;
    const copyButton = fixture.debugElement.query(By.css('#copy')).nativeElement;

    expect(cutButton.disabled).toBeFalsy();
    expect(copyButton.disabled).toBeFalsy();
  });

  it('deactivates cut and copy button if no selection is active', () => {
    // given

    // when
    fixture.detectChanges();

    // then
    const cutButton = fixture.debugElement.query(By.css('#cut')).nativeElement;
    const copyButton = fixture.debugElement.query(By.css('#copy')).nativeElement;

    expect(cutButton.disabled).toBeTruthy();
    expect(copyButton.disabled).toBeTruthy();
  });

  it('marks node for cutting when selecting the cut button', async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();

    // when
    component.select(component.model.children[0]);
    fixture.detectChanges();
    const cutButton = fixture.debugElement.query(By.css('#cut')).nativeElement;
    cutButton.click();
    fixture.detectChanges();

    // then
    expect(component.hasCuttedNodeInClipboard()).toBeTruthy();
  });

  it('marks node for copying when selecting the copy button', async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();

    // when
    component.select(component.model.children[0]);
    fixture.detectChanges();
    const copyButton = fixture.debugElement.query(By.css('#copy')).nativeElement;
    copyButton.click();
    fixture.detectChanges();

    // then
    expect(component.hasCopiedNodeInClipboard()).toBeTruthy();
  });

  it('marks node for cutting when selecting the cut button regard less of previous marks', async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();
    component.select(component.model.children[0]);
    fixture.detectChanges();
    const copyButton = fixture.debugElement.query(By.css('#copy')).nativeElement;
    copyButton.click();
    fixture.detectChanges();
    expect(component.hasCopiedNodeInClipboard()).toBeTruthy();

    // when
    const cutButton = fixture.debugElement.query(By.css('#cut')).nativeElement;
    cutButton.click();
    fixture.detectChanges();

    // then
    expect(component.hasCuttedNodeInClipboard()).toBeTruthy();
    expect(component.hasCopiedNodeInClipboard()).toBeFalsy();
  });

  it('marks node for copying when selecting the copy button regard less of previous marks', async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();
    component.select(component.model.children[0]);
    fixture.detectChanges();
    const cutButton = fixture.debugElement.query(By.css('#cut')).nativeElement;
    cutButton.click();
    fixture.detectChanges();
    expect(component.hasCuttedNodeInClipboard()).toBeTruthy();

    // when
    const copyButton = fixture.debugElement.query(By.css('#copy')).nativeElement;
    copyButton.click();
    fixture.detectChanges();

    // then
    expect(component.hasCuttedNodeInClipboard()).toBeFalsy();
    expect(component.hasCopiedNodeInClipboard()).toBeTruthy();
  });

  it('paste deactivated if no (target) selection is present', async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();
    component.select(component.model.children[1]);
    fixture.detectChanges();
    const cutButton = fixture.debugElement.query(By.css('#cut')).nativeElement;
    cutButton.click();
    fixture.detectChanges();
    expect(component.hasCuttedNodeInClipboard()).toBeTruthy();

    // when
    component.select(null); // no selection
    fixture.detectChanges();

    // then
    const pasteButton = fixture.debugElement.query(By.css('#paste')).nativeElement;
    expect(pasteButton.disabled).toBeTruthy();
  });

  it('pastes the last marked node into the selected folder and creates it on the backend', fakeAsync(async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();
    component.select(component.model.children[1]);
    fixture.detectChanges();
    const copyButton = fixture.debugElement.query(By.css('#copy')).nativeElement;
    copyButton.click();
    fixture.detectChanges();
    expect(component.hasCopiedNodeInClipboard()).toBeTruthy();
    when(mockPersistenceService.copyResource('src/test/java/subfolder/test.tcl', 'src/test/java/test.tcl' ))
      .thenResolve('src/test/java/subfolder/test.tcl');
    when(mockFilenameValidator.isValidFileName('test.tcl')).thenReturn(true);

    // when
    component.select(component.model.children[0]); // select subfolder
    fixture.detectChanges();
    const pasteButton = fixture.debugElement.query(By.css('#paste')).nativeElement;
    expect(pasteButton.disabled).toBeFalsy();
    pasteButton.click();
    fixture.detectChanges();
    tick();

    // then
    expect(component.model.children[0].children[0].name).toEqual('test.tcl');
    expect(component.model.children[0].children[0].id).toEqual('src/test/java/subfolder/test.tcl');
    expect(component.hasCuttedNodeInClipboard()).toBeFalsy();
    expect(component.hasCopiedNodeInClipboard()).toBeFalsy();
  }));

  it('moves node to new subfolder and executes delete if pasting cutted nodes', fakeAsync(async () => {
   // given
    await component.updateModel();
    fixture.detectChanges();
    component.select(component.model.children[1]);
    fixture.detectChanges();
    const cutButton = fixture.debugElement.query(By.css('#cut')).nativeElement;
    cutButton.click();
    fixture.detectChanges();
    expect(component.hasCuttedNodeInClipboard()).toBeTruthy('hasCuttedNodeInClipboard');
    when(mockPersistenceService.renameResource('src/test/java/subfolder/test.tcl', 'src/test/java/test.tcl'))
      .thenResolve('src/test/java/subfolder/test.tcl');
    when(mockFilenameValidator.isValidFileName('test.tcl')).thenReturn(true);

    // when
    component.select(component.model.children[0]); // select subfolder
    fixture.detectChanges();
    const pasteButton = fixture.debugElement.query(By.css('#paste')).nativeElement;
    expect(pasteButton.disabled).toBeFalsy();
    pasteButton.click();
    fixture.detectChanges();
    tick();

    // then
    expect(component.model.children[0].children[0].name).toEqual('test.tcl');
    expect(component.model.children[0].children[0].id).toEqual('src/test/java/subfolder/test.tcl');
    expect(component.model.children[1].name).toEqual('test.tsl');
    expect(component.model.children.length).toEqual(2);
    expect(component.hasCuttedNodeInClipboard()).toBeFalsy();
    expect(component.hasCopiedNodeInClipboard()).toBeFalsy();
  }));

  it('keeps the mark if pasting fails', fakeAsync(async () => {
    await component.updateModel();
    fixture.detectChanges();
    component.select(component.model.children[1]);
    fixture.detectChanges();
    const copyButton = fixture.debugElement.query(By.css('#copy')).nativeElement;
    copyButton.click();
    fixture.detectChanges();
    expect(component.hasCopiedNodeInClipboard()).toBeTruthy();
    when(mockPersistenceService.copyResource('src/test/java/subfolder/test.tcl', 'src/test/java/test.tcl' ))
      .thenThrow(new Error('could not find file src/test/java/test.tcl'));
    when(mockFilenameValidator.isValidFileName('test.tcl')).thenReturn(true);

    // when
    component.select(component.model.children[0]); // select subfolder
    fixture.detectChanges();
    const pasteButton = fixture.debugElement.query(By.css('#paste')).nativeElement;
    expect(pasteButton.disabled).toBeFalsy();
    pasteButton.click();
    fixture.detectChanges();
    tick();

    // then
    expect(component.model.children[0].children.length).toEqual(0);
    expect(component.model.children.length).toEqual(3);
    expect(component.hasCuttedNodeInClipboard()).toBeFalsy();
    expect(component.hasCopiedNodeInClipboard()).toBeTruthy();
  }));

  it('does not change the tree if  pasting fails during backend create in case of cutting', fakeAsync(async () => {
    await component.updateModel();
    fixture.detectChanges();
    component.select(component.model.children[1]);
    fixture.detectChanges();
    const cutButton = fixture.debugElement.query(By.css('#cut')).nativeElement;
    cutButton.click();
    fixture.detectChanges();
    expect(component.hasCuttedNodeInClipboard()).toBeTruthy();
    when(mockPersistenceService.renameResource('src/test/java/subfolder/test.tcl', 'src/test/java/test.tcl' ))
      .thenThrow(new Error('could not find file src/test/java/test.tcl'));
    when(mockFilenameValidator.isValidFileName('test.tcl')).thenReturn(true);

    // when
    component.select(component.model.children[0]); // select subfolder
    fixture.detectChanges();
    const pasteButton = fixture.debugElement.query(By.css('#paste')).nativeElement;
    expect(pasteButton.disabled).toBeFalsy();
    pasteButton.click();
    fixture.detectChanges();
    tick();

    // then
    expect(component.model.children[0].children.length).toEqual(0);
    expect(component.model.children[1].name).toEqual('test.tcl');
  }));

  it('produces requested filename if it does not exist in target', () => {
    // given
    when(mockFilenameValidator.isValidFileName(anyString())).thenReturn(true);
    const emptyTargetFolder = new TestNavigatorTreeNode({
      name: 'some',
      path: 'path/to/some',
      type: ElementType.Folder,
      children: []
    });

    const file = new TestNavigatorTreeNode({
      name: 'test.tcl',
      path: 'path/to/test.tcl',
      type: ElementType.File,
      children: []
    });

    // when
    const uniqueFileId = component.uniqifyTargetId(emptyTargetFolder, file);

    // then
    expect(uniqueFileId).toEqual('path/to/some/test.tcl');
  });

  it('produces unique files that are valid, even if target exists', () => {
    // given
    when(mockFilenameValidator.isValidFileName(anyString())).thenReturn(true);
    const nonEmptyTargetFolder = new TestNavigatorTreeNode({
      name: 'some',
      path: 'path/to/some',
      type: ElementType.Folder,
      children: [{
        name: 'test.tcl',
        path: 'path/to/some/test.tcl',
        type: ElementType.File,
        children: []
      }]
    });

    const file = new TestNavigatorTreeNode({
      name: 'test.tcl',
      path: 'path/to/test.tcl',
      type: ElementType.File,
      children: []
    });

    // when
    const uniqueFileIdInNonEmpty = component.uniqifyTargetId(nonEmptyTargetFolder, file);

    // then
    expect(uniqueFileIdInNonEmpty).toEqual('path/to/some/test_0.tcl');
  });

  it('fails if no unique file can be created on the target', () => {
    // given
    when(mockFilenameValidator.isValidFileName(anyString())).thenReturn(true);
    const fullTargetFolder = new TestNavigatorTreeNode({
      name: 'some',
      path: 'path/to/some',
      type: ElementType.Folder,
      children: [{
        name: 'test.tcl',
        path: 'path/to/some/test.tcl',
        type: ElementType.File,
        children: []
      }]
    });
    for (let i = 0; i < 10; i++) {
      fullTargetFolder.addChild({
        name: 'test_' + i + '.tcl',
        path: 'path/to/some/test_' + i + '.tcl',
        type: ElementType.File,
        children: []
      });
    }

    const file = new TestNavigatorTreeNode({
      name: 'test.tcl',
      path: 'path/to/test.tcl',
      type: ElementType.File,
      children: []
    });

    // when
    try {
      component.uniqifyTargetId(fullTargetFolder, file);
      fail('should raise an exception');
    } catch (error) {
      // then
      expect().nothing();
    }

  });

  it('fails if the unique file cannot be created, because it is no valid file name', () => {
     // given
    when(mockFilenameValidator.isValidFileName('test{}.tcl')).thenReturn(false);
    const emptyTargetFolder = new TestNavigatorTreeNode({
      name: 'some',
      path: 'path/to/some',
      type: ElementType.Folder,
      children: []
    });

    const file = new TestNavigatorTreeNode({
      name: 'test{}.tcl',
      path: 'path/to/test{}.tcl',
      type: ElementType.File,
      children: []
    });

    // when
    try {
      component.uniqifyTargetId(emptyTargetFolder, file);
      fail('invalid filename should throw an exception');
    } catch (error) {
      // then
      expect().nothing();
    }
  });

  it('enables paste if cutted is a file and target is a folder other than the clipped\' parent', () => {
    // given
    const model = new TestNavigatorTreeNode({
      name: 'workspace',
      path: 'src/test/java',
      type: ElementType.Folder,
      children: [{ name: 'sub', path: 'src/test/java/sub', type: ElementType.Folder, children: [] },
                 { name: 'test.tcl', path: 'src/test/java/test.tcl', type: ElementType.File, children: [] },
                 { name: 'test.tsl', path: 'src/test/java/test.tsl', type: ElementType.File, children: [] }]
    });

    component.model = model;
    component.select(model.children[1]);
    component.cutElement();
    component.select(model.children[0]);

    // when
    const pasteDisabled = component.pasteDisabled;

    // then
    expect(pasteDisabled).toBeFalsy();
  });

  it('enables paste if cutted is a file  and target is a file of a separate folder', () => {
    // given
    const model = new TestNavigatorTreeNode({
      name: 'workspace',
      path: 'src/test/java',
      type: ElementType.Folder,
      children: [{ name: 'sub', path: 'src/test/java/sub', type: ElementType.Folder, children: [
        { name: 'other.tcl', path: 'src/test/java/sub/other.tcl', type: ElementType.Folder, children: [] }
      ] },
                 { name: 'test.tcl', path: 'src/test/java/test.tcl', type: ElementType.File, children: [] },
                 { name: 'test.tsl', path: 'src/test/java/test.tsl', type: ElementType.File, children: [] }]
    });

    component.model = model;
    component.select(model.children[1]);
    component.cutElement();
    component.select(model.children[0].children[0]);

    // when
    const pasteDisabled = component.pasteDisabled;

    // then
    expect(pasteDisabled).toBeFalsy();
  });

  it('disables paste if cutted is a file and target is a folder equal to the clipped\' parent', () => {
    // given
    const model = new TestNavigatorTreeNode({
      name: 'workspace',
      path: 'src/test/java',
      type: ElementType.Folder,
      children: [{ name: 'sub', path: 'src/test/java/sub', type: ElementType.Folder, children: [] },
                 { name: 'test.tcl', path: 'src/test/java/test.tcl', type: ElementType.File, children: [] },
                 { name: 'test.tsl', path: 'src/test/java/test.tsl', type: ElementType.File, children: [] }]
    });

    component.model = model;
    component.select(model.children[1]);
    component.cutElement();
    component.select(model);

    // when
    const pasteDisabled = component.pasteDisabled;

    // then
    expect(pasteDisabled).toBeTruthy();
  });

  it('disables paste if cutted is a file and target is a file within the same folder', () => {
    // given
    const model = new TestNavigatorTreeNode({
      name: 'workspace',
      path: 'src/test/java',
      type: ElementType.Folder,
      children: [{ name: 'sub', path: 'src/test/java/sub', type: ElementType.Folder, children: [] },
                 { name: 'test.tcl', path: 'src/test/java/test.tcl', type: ElementType.File, children: [] },
                 { name: 'test.tsl', path: 'src/test/java/test.tsl', type: ElementType.File, children: [] }]
    });

    component.model = model;
    component.select(model.children[1]);
    component.cutElement();
    component.select(model.children[2]);

    // when
    const pasteDisabled = component.pasteDisabled;

    // then
    expect(pasteDisabled).toBeTruthy();
  });

});
