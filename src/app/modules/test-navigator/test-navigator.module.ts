import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestNavigatorComponent } from './test-navigator.component';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    TestNavigatorComponent
  ],
  exports: [
    TestNavigatorComponent
  ]
})
export class TestNavigatorModule { }
