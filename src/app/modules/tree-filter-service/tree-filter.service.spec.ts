import { inject, TestBed } from '@angular/core/testing';
import { MessagingModule } from '@testeditor/messaging-service';
import { instance, mock, when } from 'ts-mockito/lib/ts-mockito';
import { PersistenceService } from '../persistence-service/persistence.service';
import { ElementType, WorkspaceElement } from '../persistence-service/workspace-element';
import { TreeFilterService } from './tree-filter.service';


describe('TreeFilterService', () => {
  const mockPersistenceService = mock(PersistenceService);
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ MessagingModule.forRoot() ],
      providers: [ TreeFilterService,
        { provide: PersistenceService, useValue: instance(mockPersistenceService) } ]
    });
  });

  const sampleWorkspace: WorkspaceElement = {
    name: 'root', path: '', type: ElementType.Folder, children: [
      { name: 'build.gradle', path: 'build.gradle', type: ElementType.File, children: []},
      { name: 'README', path: 'README', type: ElementType.File, children: []},
      { name: 'src', path: 'src', type: ElementType.Folder, children: [
        { name: 'main', path: 'src/main', type: ElementType.Folder, children: [
          { name: 'java', path: 'src/main/java', type: ElementType.Folder, children: [
            { name: 'package', path: 'src/main/java/package', type: ElementType.Folder, children: [
              { name: 'Test.java', path: 'src/main/java/package/Test.java', type: ElementType.File, children: [] }
            ] }
          ] }
        ] },
        { name: 'test', path: 'src/test', type: ElementType.Folder, children: [
          { name: 'java', path: 'src/test/java', type: ElementType.Folder, children: [
            { name: 'package', path: 'src/test/java/package', type: ElementType.Folder, children: [
              { name: 'TestSpec.tsl', path: 'src/test/java/package/TestSpec.tsl', type: ElementType.File, children: [] },
              { name: 'TestCase.tcl', path: 'src/test/java/package/TestCase.tcl', type: ElementType.File, children: [] },
              { name: 'TestMacros.tml', path: 'src/test/java/package/TestMacros.tml', type: ElementType.File, children: [] },
              { name: 'TestConfig.config', path: 'src/test/java/package/TestConfig.config', type: ElementType.File, children: [] },
              { name: 'subpackage', path: 'src/test/java/package/subpackage', type: ElementType.Folder, children: [
                { name: 'noExtension', path: 'src/test/java/package/subpackage/noExtension', type: ElementType.File, children: [] },
                { name: 'Täst.tcl', path: 'src/test/java/package/subpackage/Täst.tcl', type: ElementType.File, children: [] }
              ] },
            ] }
          ] }
        ] }
      ]}
    ]
  };

  it('should be created', inject([TreeFilterService], (service: TreeFilterService) => {
    expect(service).toBeTruthy();
  }));

  it('should only return (unfiltered) the contents of "src/test/java"', inject([TreeFilterService], async (service: TreeFilterService) => {
    // given
    when(mockPersistenceService.listFiles()).thenResolve(sampleWorkspace);

    // when
    const actualTestFile = await service.listTreeNodes();

    // then
    expect(actualTestFile.id).toEqual('src/test/java');
    expect(actualTestFile.children.length).toEqual(1);
    expect(actualTestFile.children[0].id).toEqual('src/test/java/package');
    expect(actualTestFile.children[0].children.length).toEqual(5);
    const actualPackageContentIds = actualTestFile.children[0].children.map((node) => node.id);
    // expect contents to appear in alphabetical order
    expect(actualPackageContentIds[0]).toContain('src/test/java/package/subpackage');
    expect(actualPackageContentIds[1]).toContain('src/test/java/package/TestCase.tcl');
    expect(actualPackageContentIds[2]).toContain('src/test/java/package/TestConfig.config');
    expect(actualPackageContentIds[3]).toContain('src/test/java/package/TestMacros.tml');
    expect(actualPackageContentIds[4]).toContain('src/test/java/package/TestSpec.tsl');

    expect(actualTestFile.children[0].children[0].children.length).toEqual(2);
    expect(actualTestFile.children[0].children[0].children[0].id).toEqual('src/test/java/package/subpackage/noExtension');
    expect(actualTestFile.children[0].children[0].children[1].id).toEqual('src/test/java/package/subpackage/Täst.tcl');

  }));

});
