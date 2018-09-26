import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MessagingModule } from '@testeditor/messaging-service';
import { AppComponent } from './app.component';
import { IndexServiceMock } from './index.service.mock';
import { IndexService } from './modules/index-service/index.service';
import { PersistenceService } from './modules/persistence-service/persistence.service';
import { TestNavigatorModule } from './modules/test-navigator/test-navigator.module';
import { ValidationMarkerService } from './modules/validation-marker-service/validation-marker.service';
import { PersistenceServiceMock } from './persistence.service.mock';
import { ValidationMarkerServiceMock } from './validation-marker.service.mock';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    TestNavigatorModule.forRoot( { persistenceServiceUrl: 'http://localhost:9080' },
                                 { indexServiceUrl: 'http://localhost:8080' },
                                 { validationServiceUrl: 'http://localhsot:8080' }),
    MessagingModule.forRoot()
  ],
  providers: [
    HttpClient,
    {provide: PersistenceService, useClass: PersistenceServiceMock},
    {provide: IndexService, useClass: IndexServiceMock},
    {provide: ValidationMarkerService, useClass: ValidationMarkerServiceMock}
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
