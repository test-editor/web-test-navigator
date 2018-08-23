import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { TestNavigatorModule } from './modules/test-navigator/test-navigator.module';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    TestNavigatorModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
