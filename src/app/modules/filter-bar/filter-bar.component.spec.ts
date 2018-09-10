import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { FilterBarComponent, FilterState } from './filter-bar.component';

@Component({
  selector: `app-host-component`,
  template: `<app-filter-bar (filtersChanged)="onFiltersChanged($event)"></app-filter-bar>`
})
class TestHostComponent {
  public filterState: FilterState;

  @ViewChild(FilterBarComponent)
  public filterBarUnderTest: FilterBarComponent;

  onFiltersChanged(state: FilterState) {
    this.filterState = state;
  }
}



fdescribe('FilterBarComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, ButtonsModule.forRoot() ],
      declarations: [ TestHostComponent, FilterBarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(hostComponent.filterBarUnderTest).toBeTruthy();
  });

  it('should fire an event passing on the filter state when a button is pressed', fakeAsync(() => {
    // given
    hostComponent.filterState = undefined;
    const tslButton = fixture.debugElement.query(By.css('#filter-bar > label')).nativeElement;

    // when
    tslButton.click();
    tick();

    // then
    expect(hostComponent.filterState.tsl).toBeTruthy();
    expect(hostComponent.filterState.tcl).toBeFalsy();
    expect(hostComponent.filterState.aml).toBeFalsy();
  }));
});
