import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { TestNavigatorModule } from './modules/test-navigator/test-navigator.module';
import { MessagingModule } from '@testeditor/messaging-service';
import { PersistenceServiceMock } from './persistence.service.mock';
import { PersistenceService } from './modules/persistence-service/persistence.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { IndexService } from './modules/index-service/index.service';
import { IndexServiceMock } from './index.service.mock';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    TestNavigatorModule.forRoot( { persistenceServiceUrl: 'http://localhost:9080' },
                                 { serviceUrl: 'http://localhost:8080' },
                                 { serviceUrl: 'http://localhsot:8080' }),
    MessagingModule.forRoot()
  ],
  providers: [
    HttpClient,
    {provide: PersistenceService, useClass: PersistenceServiceMock},
    {provide: IndexService, useClass: IndexServiceMock}
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
