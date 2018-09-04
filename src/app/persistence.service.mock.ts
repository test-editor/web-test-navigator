import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WorkspaceElement, ElementType } from './modules/persistence-service/workspace-element';
import { AbstractPersistenceService } from './modules/persistence-service/persistence.service';
import { Conflict } from './modules/persistence-service/conflict';

@Injectable()
export class PersistenceServiceMock extends AbstractPersistenceService {

  readonly data: WorkspaceElement = {
    name: 'root',
    path: '',
    type: ElementType.Folder,
    children: [
      {
        name: 'hello.tsl',
        path: 'hello.tsl',
        type: ElementType.File,
        children: []
      },
      {
        name: 'world.tsl',
        path: 'world.tsl',
        type: ElementType.File,
        children: []
      },
      {
        name: 'com',
        path: 'com',
        type: ElementType.Folder,
        children: [
          {
            name: 'example',
            path: 'com/example',
            type: ElementType.Folder,
            children: [
              {
                name: 'test.tsl',
                path: 'com/example/test.tsl',
                type: ElementType.File,
                children: []
              },
              {
                name: 'test.tcl',
                path: 'com/example/test.tcl',
                type: ElementType.File,
                children: []
              }
            ]
          }
        ]
      },
      {
        name: 'test-editor.png',
        path: 'test-editor.png',
        type: ElementType.File,
        children: []
      }
    ]
  };

  constructor(private http: HttpClient) {
    super();
  }

  listFiles(): Promise<WorkspaceElement> {
    return Promise.resolve(this.data);
  }

  createResource(path: string, type: string): Promise<string | Conflict> {
    console.log(`Received createResource(path: '${path}', type: '${type}')`);
    return Promise.reject('not supported by mock');
  }

  renameResource(newPath: string, oldPath: string): Promise<string | Conflict> {
    console.log(`Received renameResource(newPath: '${newPath}', oldPath: '${oldPath}')`);
    return Promise.reject('not supported by mock');
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
