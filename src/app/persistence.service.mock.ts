import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Conflict } from './modules/persistence-service/conflict';
import { AbstractPersistenceService } from './modules/persistence-service/persistence.service';
import { ElementType, WorkspaceElement } from './modules/persistence-service/workspace-element';

@Injectable()
export class PersistenceServiceMock extends AbstractPersistenceService {

  readonly data: WorkspaceElement = {
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
              // name and path of workspace elements should be consistent; the filters only operate on paths
              { name: 'visible.file', path: 'src/test/java/package/weird.tcl', type: ElementType.File, children: [] },
              { name: 'hidden.file', path: 'src/test/java/package/hidden.file', type: ElementType.File, children: [] },
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

  constructor(private http: HttpClient) {
    super();
  }

  listFiles(): Promise<WorkspaceElement> {
    return Promise.resolve(this.data);
  }

  createResource(path: string, type: ElementType): Promise<string | Conflict> {
    console.log(`Received createResource(path: '${path}', type: '${type}')`);
    return Promise.resolve(path);
  }

  renameResource(newPath: string, oldPath: string): Promise<string | Conflict> {
    console.log(`Received renameResource(newPath: '${newPath}', oldPath: '${oldPath}')`);
    return Promise.resolve(newPath);
  }

  deleteResource(path: string): Promise<string> {
    console.log(`Received deleteResource(path: '${path}')`);
    return Promise.reject('not supported by mock');
  }

  getBinaryResource(path: string): Promise<Blob> {
    console.log(`Received getResource(path: '${path}')`);
    return this.http.get(this.getURL(path), { responseType: 'blob' }).toPromise();
  }

  getURL(path: string): string {
    console.log(`Received getURL(path: '${path}')`);
    // return the URL of an arbitrary image for the demo mock
    return 'http://testeditor.org/wp-content/uploads/2014/05/05-narrow-de-300x187.png';
  }

}
