import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, fakeAsync, TestBed, tick, inject } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { FilterBarComponent, FilterState, FilterType } from './filter-bar.component';
import { ValidationMarkerSummary } from '../validation-marker-summary/validation-marker-summary';
import { MessagingService, MessagingModule } from '@testeditor/messaging-service';
import { WORKSPACE_MARKER_UPDATE } from '../event-types';

@Component({
  selector: `app-host-component`,
  template: `<app-filter-bar [getFilteredOutMarkers]="getFilteredOutMarkers" (filtersChanged)="onFiltersChanged($event)"></app-filter-bar>`
})
class TestHostComponent {
  public static readonly markers = { tsl: new ValidationMarkerSummary({errors: 1, warnings: 2, infos: 3}),
                                     tcl: new ValidationMarkerSummary({errors: 0, warnings: 1, infos: 2}),
                                     aml: new ValidationMarkerSummary({errors: 0, warnings: 0, infos: 1})};

  public filterState: FilterState;

  @ViewChild(FilterBarComponent)
  public filterBarUnderTest: FilterBarComponent;

  getFilteredOutMarkers = (type: FilterType) => {
    if (this.filterState && !this.filterState[type] && (this.filterState.aml || this.filterState.tsl || this.filterState.tcl)) {
      return TestHostComponent.markers[type];
    } else {
      return ValidationMarkerSummary.zero;
    }
  }

  onFiltersChanged(state: FilterState) {
    this.filterState = state;
  }
}



describe('FilterBarComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, ButtonsModule.forRoot(), MessagingModule.forRoot() ],
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

  ['tcl', 'tsl', 'aml'].forEach((type: FilterType) =>
  it(`never shows ${type} validation markers when ${type} files are not being filtered out`, fakeAsync(() => {
    // given
    hostComponent.getFilteredOutMarkers = () => ValidationMarkerSummary.zero;
    fixture.detectChanges();

    // when
    const actual = hostComponent.filterBarUnderTest.showValidationMarkers(type, 'errors');

    // then
    expect(actual).toBeFalsy();
  })));

  it('shows markers on types that have been filtered out', fakeAsync(() => {
    // given
    hostComponent.filterState = { tsl: true, tcl: false, aml: false };
    const tslButton = fixture.debugElement.query(By.css('#filter-bar > label')).nativeElement;

    // when
    tslButton.click();
    tick();

    // then
    expect(hostComponent.filterBarUnderTest.showValidationMarkers('tsl', 'errors')).toBeFalsy('tsl files must not show error markers');
    expect(hostComponent.filterBarUnderTest.showValidationMarkers('tsl', 'warnings')).toBeFalsy('tsl files must not show warning markers');
    expect(hostComponent.filterBarUnderTest.showValidationMarkers('tsl', 'infos')).toBeFalsy('tsl files must not show info markers');

    expect(hostComponent.filterBarUnderTest.showValidationMarkers('tcl', 'errors')).toBeFalsy('tcl files must not show error markers');
    expect(hostComponent.filterBarUnderTest.showValidationMarkers('tcl', 'warnings')).toBeTruthy('tcl files should show warning markers');
    expect(hostComponent.filterBarUnderTest.showValidationMarkers('tcl', 'infos')).toBeFalsy('tcl files must not show error markers');

    expect(hostComponent.filterBarUnderTest.showValidationMarkers('aml', 'errors')).toBeFalsy('aml files must not show error markers');
    expect(hostComponent.filterBarUnderTest.showValidationMarkers('aml', 'warnings')).toBeFalsy('aml files must not show warning markers');
    expect(hostComponent.filterBarUnderTest.showValidationMarkers('aml', 'infos')).toBeTruthy('aml files should show info markers');
  }));

  it('sets the right css classes to display error markers on types that have been filtered out', () => {
    // given
    const tclButton = fixture.debugElement.query(By.css('#filter-tcl')).nativeElement;
    const amlButton = fixture.debugElement.query(By.css('#filter-aml')).nativeElement;

    // when
    tclButton.click();
    amlButton.click();

    // then
    const markerIcon = fixture.debugElement.query(By.css('#filter-tsl .validation-marker'));
    expect(markerIcon.classes['fa-exclamation-circle']).toBeTruthy();
    expect(markerIcon.classes['validation-errors']).toBeTruthy();

    expect(markerIcon.classes['fa-exclamation-triangle']).toBeFalsy();
    expect(markerIcon.classes['validation-warnings']).toBeFalsy();
    expect(markerIcon.classes['fa-info-circle']).toBeFalsy();
    expect(markerIcon.classes['validation-infos']).toBeFalsy();
  });

  it('sets the right css classes to display warning markers on types that have been filtered out', () => {
    // given
    const tslButton = fixture.debugElement.query(By.css('#filter-tsl')).nativeElement;
    const amlButton = fixture.debugElement.query(By.css('#filter-aml')).nativeElement;

    // when
    tslButton.click();
    amlButton.click();

    // then
    const markerIcon = fixture.debugElement.query(By.css('#filter-tcl .validation-marker'));
    expect(markerIcon.classes['fa-exclamation-triangle']).toBeTruthy();
    expect(markerIcon.classes['validation-warnings']).toBeTruthy();

    expect(markerIcon.classes['fa-exclamation-circle']).toBeFalsy();
    expect(markerIcon.classes['validation-errors']).toBeFalsy();
    expect(markerIcon.classes['fa-info-circle']).toBeFalsy();
    expect(markerIcon.classes['validation-infos']).toBeFalsy();
  });

  it('sets the right css classes to display info markers on types that have been filtered out', () => {
    // given
    const tclButton = fixture.debugElement.query(By.css('#filter-tcl')).nativeElement;
    const tslButton = fixture.debugElement.query(By.css('#filter-tsl')).nativeElement;

    // when
    tclButton.click();
    tslButton.click();

    // then
    const markerIcon = fixture.debugElement.query(By.css('#filter-aml .validation-marker'));
    expect(markerIcon.classes['fa-info-circle']).toBeTruthy();
    expect(markerIcon.classes['validation-infos']).toBeTruthy();

    expect(markerIcon.classes['fa-exclamation-circle']).toBeFalsy();
    expect(markerIcon.classes['validation-errors']).toBeFalsy();
    expect(markerIcon.classes['fa-exclamation-triangle']).toBeFalsy();
    expect(markerIcon.classes['validation-warnings']).toBeFalsy();
  });

  it('sets a tooltip summarizing the validation markers that are being filtered out', () => {
    // given
    const tclButton = fixture.debugElement.query(By.css('#filter-tcl')).nativeElement;
    const amlButton = fixture.debugElement.query(By.css('#filter-aml')).nativeElement;

    // when
    tclButton.click();
    amlButton.click();
    fixture.detectChanges();

    // then
    const tslMarkerIcon = fixture.debugElement.query(By.css('#filter-tsl .validation-marker'));
    const tclMarkerIcon = fixture.debugElement.query(By.css('#filter-tcl .validation-marker'));
    const amlMarkerIcon = fixture.debugElement.query(By.css('#filter-aml .validation-marker'));
    expect(tslMarkerIcon.nativeElement['title']).toEqual('1 error(s), 2 warning(s), 3 info(s)');
    expect(tclMarkerIcon.nativeElement['title']).toBeFalsy();
    expect(amlMarkerIcon.nativeElement['title']).toBeFalsy();
  });

  it('updates filtered-out validation markers on WORKSPACE_MARKER_UPDATE event',
    inject([MessagingService], (messageBus: MessagingService) => {
    // given
    hostComponent.getFilteredOutMarkers = (type: FilterType) => TestHostComponent.markers[type];
    ['tcl', 'tsl', 'aml'].forEach((type: FilterType) => {
      expect(hostComponent.filterBarUnderTest.markers[type]).toEqual(ValidationMarkerSummary.zero);
    });
    fixture.detectChanges();

    // when
    messageBus.publish(WORKSPACE_MARKER_UPDATE, {});

    // then
    ['tcl', 'tsl', 'aml'].forEach((type: FilterType) => {
      expect(hostComponent.filterBarUnderTest.markers[type]).toEqual(TestHostComponent.markers[type]);
      const markerIcon = fixture.debugElement.query(By.css(`#filter-${type} .validation-marker`));
      expect(markerIcon.nativeElement['title']).toEqual(TestHostComponent.markers[type].toString());
    });
  }));
});
