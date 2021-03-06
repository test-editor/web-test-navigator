import { async, ComponentFixture, fakeAsync, flush, inject, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { MessagingModule, MessagingService } from '@testeditor/messaging-service';
import { HttpProviderService, IndicatorFieldSetup, InputBoxConfig, TreeViewerModule,
  TREE_NODE_RENAME_SELECTED } from '@testeditor/testeditor-commons';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { anyString, anything, instance, mock, verify, when } from 'ts-mockito/lib/ts-mockito';
import { WORKSPACE_MARKER_UPDATE } from '../event-types';
import { EDITOR_CLOSE, EDITOR_DIRTY_CHANGED, ElementActivity, USER_ACTIVITY_UPDATED } from '../event-types-in';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import { IndexService } from '../index-service/index.service';
import { XtextIndexService } from '../index-service/xtext-index.service';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { PersistenceService } from '../persistence-service/persistence.service';
import { ElementType } from '../persistence-service/workspace-element';
import { DefaultUserActivityLabelProvider } from '../style-provider/user-activity-label-provider';
import { DefaultUserActivityStyleProvider } from '../style-provider/user-activity-style-provider';
import { TreeFilterService } from '../tree-filter-service/tree-filter.service';
import { ValidationMarkerService } from '../validation-marker-service/validation-marker.service';
import { XtextDefaultValidationMarkerService } from '../validation-marker-service/xtext-default-validation-marker.service';
import { ValidationMarkerData } from '../validation-marker-summary/validation-marker-summary';
import { FilenameValidator } from './filename-validator';
import { TestNavigatorFieldSetup, TEST_NAVIGATOR_USER_ACTIVITY_LABEL_PROVIDER, TEST_NAVIGATOR_USER_ACTIVITY_LIST,
  TEST_NAVIGATOR_USER_ACTIVITY_STYLE_PROVIDER } from './test-navigator-field-setup';
import { TestNavigatorComponent } from './test-navigator.component';
import { AtomicUserActivitySet } from './user-activity-set';
import { NAVIGATION_OPEN } from '../event-types-out';

describe('TestNavigatorComponent', () => {
  const SAMPLE_ACTIVITY = 'sample.activity';
  const SUBFOLDER_DOM_INDEX = 1;
  const TCL_FILE_DOM_INDEX = 2;
  const RENAME_FOLDER_DOM_INDEX = 4;
  const dirTree = () => ({
    name: 'root', path: 'src/test/java', type: ElementType.Folder, children: [
      {name: 'test.tcl', path: 'src/test/java/test.tcl', type: ElementType.File, children: []},
      {name: 'test.tsl', path: 'src/test/java/test.tsl', type: ElementType.File, children: []},
      {name: 'subfolder', path: 'src/test/java/subfolder', type: ElementType.Folder, children: []},
      {name: 'zRenameMe', path: 'src/test/java/zRenameMe', type: ElementType.Folder, children: [
        {name: 'nestedFile.tcl', path: 'src/test/java/zRenameMe/nestedFile.tcl', type: ElementType.File, children: []},
      ]},
    ]});


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
    when(mockPersistenceService.listFiles()).thenResolve(dirTree());
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
                  { provide: IndicatorFieldSetup, useClass: TestNavigatorFieldSetup },
                  { provide: TEST_NAVIGATOR_USER_ACTIVITY_STYLE_PROVIDER, useClass: DefaultUserActivityStyleProvider },
                  { provide: TEST_NAVIGATOR_USER_ACTIVITY_LABEL_PROVIDER, useClass: DefaultUserActivityLabelProvider },
                  { provide: TEST_NAVIGATOR_USER_ACTIVITY_LIST, useValue: [SAMPLE_ACTIVITY] }
                ]
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
    deleteButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    const confirmButton = fixture.debugElement.query(By.css('.confirm-action-confirm-button'));
    confirmButton.triggerEventHandler('click', null);
    tick(); fixture.detectChanges();
  }

  function getTreeElementSelector(domIndex: number) {
    return `app-tree-viewer > div > div:nth-child(2) > div:nth-child(${domIndex}) .tree-view-item-key`;
  }

  function selectElementClickRenameEnterTextAndHitEnter(newName: string, elementIndex = TCL_FILE_DOM_INDEX) {
    const firstNode = fixture.debugElement.query(By.css(getTreeElementSelector(elementIndex)));
    const renameButton = fixture.debugElement.query(By.css('#rename'));
    firstNode.triggerEventHandler('click', null); fixture.detectChanges();
    renameButton.triggerEventHandler('click', null); fixture.detectChanges();
    const inputBox = fixture.debugElement.query(By.css('.navInputBox > input'));
    inputBox.nativeElement.value = newName;
    inputBox.triggerEventHandler('keyup.enter', {});
    tick(); fixture.detectChanges();
  }

  function selectFirstElementClickNewFileEnterTextAndHitEnter(newName: string) {
    const firstNode = fixture.debugElement.query(By.css(getTreeElementSelector(TCL_FILE_DOM_INDEX)));
    const newFileButton = fixture.debugElement.query(By.css('#new-file'));
    firstNode.triggerEventHandler('click', null); fixture.detectChanges();
    newFileButton.triggerEventHandler('click', null); fixture.detectChanges();
    const inputBox = fixture.debugElement.query(By.css('.navInputBox > input'));
    inputBox.nativeElement.value = newName;
    inputBox.triggerEventHandler('keyup.enter', {});
    tick(); fixture.detectChanges();
  }

  function selectFileAndHitEnter() {
    const fileElement = fixture.debugElement.query(By.css(getTreeElementSelector(TCL_FILE_DOM_INDEX)));
    const keyboardEnabledTreeViewer = fixture.debugElement.query(By.css('.tree-viewer-keyboard-decorator'));
    fileElement.triggerEventHandler('click', null);
    keyboardEnabledTreeViewer.triggerEventHandler('keydown', {key: 'Enter'});
  }

  function selectFolderAndHitEnter() {
    const folderElement = fixture.debugElement.query(By.css(getTreeElementSelector(SUBFOLDER_DOM_INDEX)));
    const keyboardEnabledTreeViewer = fixture.debugElement.query(By.css('.tree-viewer-keyboard-decorator'));
    folderElement.triggerEventHandler('click', null);
    keyboardEnabledTreeViewer.triggerEventHandler('keydown', {key: 'Enter'});
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('updates filter state on event from filter-bar child component', async () => {
    // given
    const tslFilterButton = fixture.debugElement.query(By.css('#filter-bar > label'));
    await component.updateModel();
    const tslFile = component.model.children[2]; expect(tslFile.name).toEqual('test.tsl');
    const tclFile = component.model.children[1]; expect(tclFile.name).toEqual('test.tcl');

    // when
    tslFilterButton.triggerEventHandler('click', null);

    // then
    expect(tslFile.cssClasses).not.toContain('hidden');
    expect(tclFile.cssClasses).toContain('hidden');
  });

  it('ensures files cannot be expanded by clicking the icon',
    fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
      // given
      await component.updateModel(); fixture.detectChanges();
      const tclIcon = fixture.debugElement.query(
        By.css('app-tree-viewer > div > div:nth-child(2) > div:nth-child(2) .tree-view-item-key > div > span')
      );
      expect(tclIcon.classes['fa-file']).toBeTruthy();

      // when
      tclIcon.triggerEventHandler('click', new MouseEvent('click')); fixture.detectChanges();

      // then
      expect(tclIcon.classes['fa-file']).toBeTruthy();
    }
  )));

  it('ensures folders can be expanded by clicking the icon',
    fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
      // given
      await component.updateModel(); fixture.detectChanges();
      const folderIcon = fixture.debugElement.query(
        By.css('app-tree-viewer > div > div:nth-child(2) > div:nth-child(1) .tree-view-item-key > div > span')
      );
      expect(folderIcon.classes['fa-chevron-right']).toBeTruthy();
      expect(folderIcon.classes['fa-chevron-down']).toBeFalsy();

      // when
      folderIcon.triggerEventHandler('click', new MouseEvent('click')); fixture.detectChanges();

      // then
      expect(folderIcon.classes['fa-chevron-right']).toBeFalsy();
      expect(folderIcon.classes['fa-chevron-down']).toBeTruthy();
    }
  )));

  it('validates the input using FilenameValidator during a new element request', async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();
    const newFileButton = fixture.debugElement.query(By.css('#new-file'));
    const contextElement = fixture.debugElement.query(By.css('.tree-view-item-key'));
    contextElement.triggerEventHandler('click', null); fixture.detectChanges();
    newFileButton.triggerEventHandler('click', null); fixture.detectChanges();
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
    root.triggerEventHandler('click', null); fixture.detectChanges();

    // then
    expect(renameButton.nativeElement.disabled).toBeTruthy();
  });

  it('keeps rename button active even when selection is dirty', async () => {
    // given
    await component.updateModel();
    component.model.expanded = true;
    component.model.children[1].dirty = true;
    fixture.detectChanges();
    const renameButton = fixture.debugElement.query(By.css('#rename'));
    const testNode = fixture.debugElement.query(By.css('app-tree-viewer > div > div:nth-child(2) > div:nth-child(2) .tree-view-item-key'));

    // when
    testNode.triggerEventHandler('click', null); fixture.detectChanges();

    // then
    expect(renameButton.nativeElement.disabled).toBeFalsy();
    expect(renameButton.nativeElement['title']).toEqual('rename "test.tcl"');
  });

  it('enables rename if the file of the selected node was saved and has no changes anymore',
     fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
       await component.updateModel();
       component.model.expanded = true;
       component.model.children[1].dirty = true;
       fixture.detectChanges();
       const renameButton = fixture.debugElement.query(By.css('#rename'));
       const testNode = fixture.debugElement.query(
         By.css('app-tree-viewer > div > div:nth-child(2) > div:nth-child(2) .tree-view-item-key'));

       // when
       // register for events of the node for an open editor file
       testNode.triggerEventHandler('dblclick', new MouseEvent('dblclick'));
       // this event should be listened for because of the registeration
       messageBus.publish(EDITOR_DIRTY_CHANGED, { path: component.model.children[1].id, dirty: false });
       tick();
       fixture.detectChanges();

       // then
       expect(renameButton.nativeElement.disabled).toBeFalsy();
       expect(renameButton.nativeElement['title']).toEqual('rename "test.tcl"');
     })));

  it('enables rename button after rename was cancelled',
     fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
       // given
       await component.updateModel();
       component.model.expanded = true;
       fixture.detectChanges();
       const renameButton = fixture.debugElement.query(By.css('#rename'));
       const testNode = fixture.debugElement.query(
         By.css('app-tree-viewer > div > div:nth-child(2) > div:nth-child(2) .tree-view-item-key'));
       testNode.triggerEventHandler('click', null); // thus this node is selected
       fixture.detectChanges();
       spyOn(messageBus, 'publish').and.callFake(async (id: string, payload: InputBoxConfig) => {
         if (id === TREE_NODE_RENAME_SELECTED) {
           await payload.onCancel();
         }
       });

       // when
       component.renameElement();
       tick();
       testNode.triggerEventHandler('click', null); // thus this node is selected
       fixture.detectChanges();

       // then
       expect(renameButton.nativeElement.disabled).toBeFalsy();
       expect(renameButton.nativeElement['title']).toEqual('rename "test.tcl"');
     })));

  it('enables rename after rename finished (even if unsuccessful)',
     fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
       // given
       await component.updateModel();
       component.model.expanded = true;
       fixture.detectChanges();
       const renameButton = fixture.debugElement.query(By.css('#rename'));
       const testNode = fixture.debugElement.query(
         By.css('app-tree-viewer > div > div:nth-child(2) > div:nth-child(2) .tree-view-item-key'));
       testNode.triggerEventHandler('click', null); // thus this node is selected
       fixture.detectChanges();
       when(mockPersistenceService.renameResource('src/test/java/subfolder/test.tcl', 'src/test/java/test.tcl'))
         .thenThrow(new Error('some')); // make renaming unsuccessfull => throw an error
       spyOn(messageBus, 'publish').and.callFake((id: string, payload: InputBoxConfig) => {
         if (id === TREE_NODE_RENAME_SELECTED) {
           payload.onConfirm('src/test/java/subfolder/test.tcl'); // call rename confirmation (which fails eventually)
         }
       });

       // when
       component.renameElement();
       tick();
       testNode.triggerEventHandler('click', null); // thus this node is selected
       fixture.detectChanges();

       // then
       expect(renameButton.nativeElement.disabled).toBeFalsy();
       expect(renameButton.nativeElement['title']).toEqual('rename "src/test/java/subfolder/test.tcl"');
     })));

  it('disables rename if a rename is currently running', fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
    // given
    await component.updateModel();
    component.model.expanded = true;
    fixture.detectChanges();
    const renameButton = fixture.debugElement.query(By.css('#rename'));
    const testNode = fixture.debugElement.query(
      By.css('app-tree-viewer > div > div:nth-child(2) > div:nth-child(2) .tree-view-item-key'));
    testNode.triggerEventHandler('click', null); // thus this node is selected

    // when
    component.renameElement();
    fixture.detectChanges();

    // then
    expect(renameButton.nativeElement.disabled).toBeTruthy();
    expect(renameButton.nativeElement['title']).toEqual('cannot rename until currently running rename finished');
  })));

  it('keeps rename active even if the file of the selected node has unsaved changes',
     fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
       await component.updateModel();
       component.model.expanded = true;
       component.model.children[1].dirty = false;
       fixture.detectChanges();
       const renameButton = fixture.debugElement.query(By.css('#rename'));
       const testNode = fixture.debugElement.query(
         By.css('app-tree-viewer > div > div:nth-child(2) > div:nth-child(2) .tree-view-item-key'));

       // when
       // register for events of the node for an open editor file
       testNode.triggerEventHandler('dblclick', new MouseEvent('dblclick'));
       // this event should be listened for because of the registeration
       messageBus.publish(EDITOR_DIRTY_CHANGED, { path: component.model.children[1].id, dirty: true });
       tick();
       fixture.detectChanges();

       // then
       expect(renameButton.nativeElement.disabled).toBeFalsy();
       expect(renameButton.nativeElement['title']).toEqual('rename "test.tcl"');
     })));

  it('reactivates rename if file of the selected node had unsaved changes, but editor was closed',
     fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
       // given
       await component.updateModel();
       component.model.expanded = true;
       component.model.children[1].dirty = true;
       fixture.detectChanges();
       const renameButton = fixture.debugElement.query(By.css('#rename'));
       const testNode = fixture.debugElement.query(
         By.css('app-tree-viewer > div > div:nth-child(2) > div:nth-child(2) .tree-view-item-key'));

       // when
       testNode.triggerEventHandler('dblclick', new MouseEvent('dblclick'));
       messageBus.publish(EDITOR_CLOSE, { path: component.model.children[1].id });
       tick();
       fixture.detectChanges();

       // then
       expect(renameButton.nativeElement.disabled).toBeFalsy();
       expect(renameButton.nativeElement['title']).toEqual('rename "test.tcl"');
     })));

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
       expect(component.model.children.length).toEqual(dirTree().children.length - 1);
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
       expect(component.model.children.length).toEqual(dirTree().children.length);
       expect(component.model.children[1].name).toEqual(elementFailingToBeDeleted.name);
       expect(fixture.debugElement.query(By.css('#errorMessage')).nativeElement.innerText).toEqual('Error while deleting element!');
       flush();
     }));

  it('retrieves and sets validation markers during initialization', fakeAsync( async () => {
    // given + when
    await component.updateModel();
    tick(); fixture.detectChanges();

    // then
    const tslFile = component.model.children[2];
    const tclFile = component.model.children[1];
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
    expect(component.model.children[1].validation).toEqual(jasmine.objectContaining({errors: 23, warnings: 42, infos: 3}));
  }));

  it('changes child node ID after successful rename', fakeAsync(async () => {
    // given
    await component.updateModel();
    component.model.expanded = true;
    fixture.detectChanges();
    const parent = component.model.children.find((node) => node.id === 'src/test/java/zRenameMe');
    expect(parent.children[0].id).toEqual('src/test/java/zRenameMe/nestedFile.tcl', 'test assumptions not satisfied!');

    // when
    selectElementClickRenameEnterTextAndHitEnter('renamed', RENAME_FOLDER_DOM_INDEX);

    // then
    expect(parent.children[0].id).toEqual('src/test/java/renamed/nestedFile.tcl');
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
    selectElementClickRenameEnterTextAndHitEnter('renamed.tcl');

    // then
    expect(component.model.validation).toEqual(jasmine.objectContaining({errors: 3, warnings: 5, infos: 7}));
    expect(component.model.children[1].validation).toEqual(jasmine.objectContaining({errors: 3, warnings: 4, infos: 5}));
    expect(component.model.children[2].validation).toEqual(jasmine.objectContaining({errors: 0, warnings: 1, infos: 2}));
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
    expect(component.model.children[2].validation).toEqual(jasmine.objectContaining({errors: 3, warnings: 4, infos: 5}));
    expect(component.model.children[3].validation).toEqual(jasmine.objectContaining({errors: 0, warnings: 1, infos: 2}));
  }));

  it('updates validation markers when an open file is saved', fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
    // given
    await component.updateModel();
    component.model.expanded = true;
    fixture.detectChanges();
    const firstNode = fixture.debugElement.query(By.css('app-tree-viewer > div > div:nth-child(2) > div:nth-child(2) .tree-view-item-key'));

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
    expect(component.model.children[1].validation).toEqual(jasmine.objectContaining({errors: 3, warnings: 4, infos: 5}));
    expect(component.model.children[2].validation).toEqual(jasmine.objectContaining({errors: 0, warnings: 1, infos: 2}));
  })));


  it('activates cut and copy button if the selection is a file', async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();

    // when
    component.select(component.model.children[2]);
    fixture.detectChanges();

    // then
    const cutButton = fixture.debugElement.query(By.css('#cut')).nativeElement;
    const copyButton = fixture.debugElement.query(By.css('#copy')).nativeElement;

    expect(cutButton.disabled).toBeFalsy();
    expect(copyButton.disabled).toBeFalsy();
  });

  it('deactivates cut and copy button if selection is a folder', async () => {
    await component.updateModel();
    fixture.detectChanges();

    // when
    component.select(component.model);
    fixture.detectChanges();

    // then
    const cutButton = fixture.debugElement.query(By.css('#cut')).nativeElement;
    const copyButton = fixture.debugElement.query(By.css('#copy')).nativeElement;

    expect(cutButton.disabled).toBeTruthy();
    expect(copyButton.disabled).toBeTruthy();
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
    component.select(component.model.children[2]);
    fixture.detectChanges();
    const cutButton = fixture.debugElement.query(By.css('#cut'));
    cutButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    // then
    expect(component.hasCuttedNodeInClipboard()).toBeTruthy();
  });

  it('marks node for copying when selecting the copy button', async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();

    // when
    component.select(component.model.children[2]);
    fixture.detectChanges();
    const copyButton = fixture.debugElement.query(By.css('#copy'));
    copyButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    // then
    expect(component.hasCopiedNodeInClipboard()).toBeTruthy();
  });

  it('marks node for cutting when selecting the cut button regard less of previous marks', async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();
    component.select(component.model.children[2]);
    fixture.detectChanges();
    const copyButton = fixture.debugElement.query(By.css('#copy'));
    copyButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(component.hasCopiedNodeInClipboard()).toBeTruthy();

    // when
    const cutButton = fixture.debugElement.query(By.css('#cut'));
    cutButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    // then
    expect(component.hasCuttedNodeInClipboard()).toBeTruthy();
    expect(component.hasCopiedNodeInClipboard()).toBeFalsy();
  });

  it('marks node for copying when selecting the copy button regard less of previous marks', async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();
    component.select(component.model.children[2]);
    fixture.detectChanges();
    const cutButton = fixture.debugElement.query(By.css('#cut'));
    cutButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(component.hasCuttedNodeInClipboard()).toBeTruthy();

    // when
    const copyButton = fixture.debugElement.query(By.css('#copy'));
    copyButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    // then
    expect(component.hasCuttedNodeInClipboard()).toBeFalsy();
    expect(component.hasCopiedNodeInClipboard()).toBeTruthy();
  });

  it('deactivates paste if no (target) selection is present', async () => {
    // given
    await component.updateModel();
    fixture.detectChanges();
    component.select(component.model.children[1]);
    fixture.detectChanges();
    const cutButton = fixture.debugElement.query(By.css('#cut'));
    cutButton.triggerEventHandler('click', null);
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
    const copyButton = fixture.debugElement.query(By.css('#copy'));
    copyButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(component.hasCopiedNodeInClipboard()).toBeTruthy();
    when(mockPersistenceService.copyResource('src/test/java/subfolder/test.tcl', 'src/test/java/test.tcl' ))
      .thenResolve('src/test/java/subfolder/test.tcl');
    when(mockFilenameValidator.isValidFileName('test.tcl')).thenReturn(true);

    // when
    component.select(component.model.children[0]); // select subfolder
    fixture.detectChanges();
    const pasteButton = fixture.debugElement.query(By.css('#paste'));
    expect(pasteButton.nativeElement.disabled).toBeFalsy();
    pasteButton.triggerEventHandler('click', null);
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
    const cutButton = fixture.debugElement.query(By.css('#cut'));
    cutButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(component.hasCuttedNodeInClipboard()).toBeTruthy('hasCuttedNodeInClipboard');
    when(mockPersistenceService.renameResource('src/test/java/subfolder/test.tcl', 'src/test/java/test.tcl'))
      .thenResolve('src/test/java/subfolder/test.tcl');
    when(mockFilenameValidator.isValidFileName('test.tcl')).thenReturn(true);

    // when
    component.select(component.model.children[0]); // select subfolder
    fixture.detectChanges();
    const pasteButton = fixture.debugElement.query(By.css('#paste'));
    expect(pasteButton.nativeElement.disabled).toBeFalsy();
    pasteButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    tick();

    // then
    expect(component.model.children[0].children[0].name).toEqual('test.tcl');
    expect(component.model.children[0].children[0].id).toEqual('src/test/java/subfolder/test.tcl');
    expect(component.model.children[1].name).toEqual('test.tsl');
    expect(component.model.children.length).toEqual(dirTree().children.length - 1);
    expect(component.hasCuttedNodeInClipboard()).toBeFalsy();
    expect(component.hasCopiedNodeInClipboard()).toBeFalsy();
  }));

  it('keeps the mark if pasting fails', fakeAsync(async () => {
    await component.updateModel();
    fixture.detectChanges();
    component.select(component.model.children[1]);
    fixture.detectChanges();
    const copyButton = fixture.debugElement.query(By.css('#copy'));
    copyButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(component.hasCopiedNodeInClipboard()).toBeTruthy();
    when(mockPersistenceService.copyResource('src/test/java/subfolder/test.tcl', 'src/test/java/test.tcl' ))
      .thenThrow(new Error('could not find file src/test/java/test.tcl'));
    when(mockFilenameValidator.isValidFileName('test.tcl')).thenReturn(true);

    // when
    component.select(component.model.children[0]); // select subfolder
    fixture.detectChanges();
    const pasteButton = fixture.debugElement.query(By.css('#paste'));
    expect(pasteButton.nativeElement.disabled).toBeFalsy();
    pasteButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    tick();

    // then
    expect(component.model.children[0].children.length).toEqual(0);
    expect(component.model.children.length).toEqual(dirTree().children.length);
    expect(component.hasCuttedNodeInClipboard()).toBeFalsy();
    expect(component.hasCopiedNodeInClipboard()).toBeTruthy();
  }));

  it('does not change the tree if  pasting fails during backend create in case of cutting', fakeAsync(async () => {
    await component.updateModel();
    fixture.detectChanges();
    component.select(component.model.children[1]);
    fixture.detectChanges();
    const cutButton = fixture.debugElement.query(By.css('#cut'));
    cutButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(component.hasCuttedNodeInClipboard()).toBeTruthy();
    when(mockPersistenceService.renameResource('src/test/java/subfolder/test.tcl', 'src/test/java/test.tcl' ))
      .thenThrow(new Error('could not find file src/test/java/test.tcl'));
    when(mockFilenameValidator.isValidFileName('test.tcl')).thenReturn(true);

    // when
    component.select(component.model.children[0]); // select subfolder
    fixture.detectChanges();
    const pasteButton = fixture.debugElement.query(By.css('#paste'));
    expect(pasteButton.nativeElement.disabled).toBeFalsy();
    pasteButton.triggerEventHandler('click', null);
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

    // when + then
    expect(() => component.uniqifyTargetId(fullTargetFolder, file)).toThrowError();

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

    // when + then
    expect(() => component.uniqifyTargetId(emptyTargetFolder, file)).toThrowError(new RegExp('.*is an invalid filename.$'));
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

  it('emits WORKSPACE_MARKER_UPDATE event after the validation markers have been updated',
     fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
       // given
       await component.updateModel();
       let eventReceived = false;
       messageBus.subscribe(WORKSPACE_MARKER_UPDATE, () => eventReceived = true);

       // when
       await component.updateValidationMarkers(component.model);
       tick();

       // then
       expect(eventReceived).toBeTruthy();
     })));

  it('updates tree with collaborator activities on receiving USER_ACTIVITY_UPDATED',
  fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
    // given
    await component.updateModel();
    const tclFile = component.model.children[1];
    const collaboratorActivities: ElementActivity[] = [
      {element: 'src/test/java/test.tcl', activities: [
        { user: 'John Doe', type: 'openedFile'},
        { user: 'John Doe', type: 'typesIntoFile'},
        { user: 'Jane Doe', type: 'openedFile'}]
      }, {element: 'src/test/java', activities: [
        {user: 'Jane Doe', type: 'deletedElement'}]
      }];

    // when
    messageBus.publish(USER_ACTIVITY_UPDATED, collaboratorActivities);
    tick();
    fixture.detectChanges();

    // then
    expect(component.model.activities.getUsers('deletedElement').length).toEqual(1);
    expect(component.model.activities.getUsers('deletedElement')).toContain('Jane Doe');
    expect(tclFile.activities.getTypes().length).toEqual(2);
    expect(tclFile.activities.getTypes()).toContain('openedFile');
    expect(tclFile.activities.getTypes()).toContain('typesIntoFile');
    expect(tclFile.activities.getUsers('openedFile').length).toEqual(2);
    expect(tclFile.activities.getUsers('openedFile')).toContain('John Doe');
    expect(tclFile.activities.getUsers('openedFile')).toContain('Jane Doe');
    expect(tclFile.activities.getUsers('typesIntoFile').length).toEqual(1);
    expect(tclFile.activities.getUsers('typesIntoFile')).toContain('John Doe');
  })));

  it('shows icons and tooltip to indicate collaborator activities on receiving USER_ACTIVITY_UPDATED',
  fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
    // given
    await component.updateModel();
    const collaboratorActivities: ElementActivity[] = [
      {element: 'src/test/java/test.tcl', activities: [
        { user: 'John Doe', type: SAMPLE_ACTIVITY},
        { user: 'Jane Doe', type: SAMPLE_ACTIVITY}]
      }];

    // when
    messageBus.publish(USER_ACTIVITY_UPDATED, collaboratorActivities);
    tick();
    fixture.detectChanges();

    // then
    const testTclUserActivityIcon = fixture.debugElement.query(By.css(
      'div:nth-child(2) div:nth-child(2) > app-tree-viewer .indicator-boxes div:nth-child(2) app-indicator-box > div'));
    expect(testTclUserActivityIcon.nativeElement.classList).toContain('fa');
    expect(testTclUserActivityIcon.nativeElement.classList).toContain('fa-user');
    expect(testTclUserActivityIcon.nativeElement.classList).toContain('user-activity');
    expect(testTclUserActivityIcon.nativeElement.title).toEqual('one or more collaborators are currently working on this');
  })));

  it('removes user activity icon when received USER_ACTIVITY_UPDATED event does not include that activity anymore',
  fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
    // given
    await component.updateModel();
    const tclFile = component.model.children[1];
    tclFile.activities = new AtomicUserActivitySet([{ user: 'John Doe', type: SAMPLE_ACTIVITY}]);
    fixture.detectChanges();
    let testTclUserActivityIcon = fixture.debugElement.query(By.css(
      'div:nth-child(2) div:nth-child(2) > app-tree-viewer .indicator-boxes div:nth-child(2) app-indicator-box > div'));
    expect(testTclUserActivityIcon.nativeElement.classList).toContain('fa');
    expect(testTclUserActivityIcon.nativeElement.classList).toContain('fa-user');
    expect(testTclUserActivityIcon.nativeElement.classList).toContain('user-activity');
    expect(testTclUserActivityIcon.nativeElement.title).toEqual('one or more collaborators are currently working on this');

    const changedActivities: ElementActivity[] = [
      {element: 'src/test/java', activities: [
        { user: 'Jane Doe', type: 'some activity on other element'}]
      }];

    // when
    messageBus.publish(USER_ACTIVITY_UPDATED, changedActivities);
    tick();
    fixture.detectChanges();

    // then
    testTclUserActivityIcon = fixture.debugElement.query(By.css(
      'div:nth-child(2) div:nth-child(2) > app-tree-viewer .indicator-boxes div:nth-child(2) app-indicator-box > div'));
      expect(testTclUserActivityIcon.nativeElement.classList).not.toContain('fa');
      expect(testTclUserActivityIcon.nativeElement.classList).not.toContain('fa-cog');
      expect(testTclUserActivityIcon.nativeElement.classList).not.toContain('user-activity');
      expect(testTclUserActivityIcon.nativeElement.title).toBeFalsy();
  })));

  it('puts collaborator activities into parent nodes if the actual node does not exist',
  fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
    // given
    await component.updateModel();
    const subfolder = component.model.children[0];
    const collaboratorActivities: ElementActivity[] = [{
      element: 'src/test/java/subfolder/newfolder/newfile.ext', activities: [{user: 'Jane Doe', type: 'created.file'}]
    }];

    // when
    messageBus.publish(USER_ACTIVITY_UPDATED, collaboratorActivities);
    tick();

    // then
    expect(component.model.activities.getTypes('src/test/java/subfolder/newfolder/newfile.ext')).toContain('created.file');
    expect(component.model.activities.getUsers('created.file')).toContain('Jane Doe');
    expect(subfolder.id).toEqual('src/test/java/subfolder');
    expect(subfolder.activities.getTypes('src/test/java/subfolder/newfolder/newfile.ext')).toContain('created.file');
    expect(subfolder.activities.getUsers('created.file', 'src/test/java/subfolder/newfolder/newfile.ext')).toContain('Jane Doe');
  })));

  it('removes collaborator activities on non-existing nodes from parent nodes when update does not contain them anymore',
  fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
    // given
    await component.updateModel();
    const subfolder = component.model.children[0];
    const collaboratorActivities: ElementActivity[] = [{
      element: 'src/test/java/subfolder/newfolder/newfile.ext', activities: [{user: 'Jane Doe', type: 'created.file'}]
    }];
    messageBus.publish(USER_ACTIVITY_UPDATED, collaboratorActivities);
    tick();

    // when
    messageBus.publish(USER_ACTIVITY_UPDATED, []);
    tick();

    // then
    expect(component.model.activities.getTypes('src/test/java/subfolder/newfolder/newfile.ext').length).toEqual(0);
    expect(component.model.activities.getUsers('created.file').length).toEqual(0);
    expect(subfolder.id).toEqual('src/test/java/subfolder');
    expect(subfolder.activities.getTypes('src/test/java/subfolder/newfolder/newfile.ext').length).toEqual(0);
    expect(subfolder.activities.getUsers('created.file', 'src/test/java/subfolder/newfolder/newfile.ext').length).toEqual(0);
  })));


  it('shows icon and tooltip on parent when no closer ancestor node for the event is visible',
  fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
    // given
    await component.updateModel();
    component.model.expanded = true;
    const collaboratorActivities: ElementActivity[] = [
      {element: 'src/test/java/newDir/newFile.tcl', activities: [{ user: 'John Doe', type: SAMPLE_ACTIVITY}]}
    ];

    // when
    messageBus.publish(USER_ACTIVITY_UPDATED, collaboratorActivities);
    tick();
    fixture.detectChanges();

    // then
    const workspaceRootActivityIcon = fixture.debugElement.query(By.css(
      'div.indicator-boxes > div:nth-child(2) > app-indicator-box > div'));
    expect(workspaceRootActivityIcon.nativeElement.classList).toContain('fa');
    expect(workspaceRootActivityIcon.nativeElement.classList).toContain('fa-user');
    expect(workspaceRootActivityIcon.nativeElement.classList).toContain('user-activity');
    expect(workspaceRootActivityIcon.nativeElement.title).toEqual('one or more collaborators are currently working on this');
  })));

  it('does NOT show icon and tooltip on parent when closer ancestor node for the event is visible',
  fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
    // given
    await component.updateModel();
    component.model.expanded = true;
    const collaboratorActivities: ElementActivity[] = [
      {element: 'src/test/java/subfolder/file-with-closer-ancestor.tcl', activities: [{ user: 'John Doe', type: SAMPLE_ACTIVITY}]}
    ];

    // when
    messageBus.publish(USER_ACTIVITY_UPDATED, collaboratorActivities);
    tick();
    fixture.detectChanges();

    // then
    const workspaceRootActivityIcon = fixture.debugElement.query(By.css(
      'div.indicator-boxes > div:nth-child(2) > app-indicator-box > div'));
    expect(workspaceRootActivityIcon.nativeElement.classList).not.toContain('fa');
    expect(workspaceRootActivityIcon.nativeElement.classList).not.toContain('fa-user');
    expect(workspaceRootActivityIcon.nativeElement.classList).not.toContain('user-activity');
    expect(workspaceRootActivityIcon.nativeElement.title).toBeFalsy();
  })));

  it('opens selected file on Enter', fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
    // given
    await component.updateModel();
    let openHasBeenCalled = false;
    let actualPayload: any = null;
    messageBus.subscribe(NAVIGATION_OPEN, (payload) => {
      openHasBeenCalled = true;
      actualPayload = payload;
    });
    component.model.expanded = true;
    fixture.detectChanges();

    // when
    selectFileAndHitEnter();

    // then
    expect(openHasBeenCalled).toBeTruthy();
    expect(actualPayload).toEqual(jasmine.objectContaining({id: 'src/test/java/test.tcl'}));
  })));

  it('does not attempt to open selected folder on Enter', fakeAsync(inject([MessagingService], async (messageBus: MessagingService) => {
    // given
    await component.updateModel();
    let openHasBeenCalled = false;
    messageBus.subscribe(NAVIGATION_OPEN, () => openHasBeenCalled = true);
    component.model.expanded = true;
    fixture.detectChanges();

    // when
    selectFolderAndHitEnter();

    // then
    expect(openHasBeenCalled).toBeFalsy();
  })));
});
