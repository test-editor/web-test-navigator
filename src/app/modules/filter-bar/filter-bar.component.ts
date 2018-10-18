import { Component, OnInit, Output, EventEmitter, Input, ChangeDetectorRef } from '@angular/core';
import { ValidationMarkerSummary } from '../validation-marker-summary/validation-marker-summary';

export interface FilterState { tsl: boolean; tcl: boolean; aml: boolean; }
export type FilterType = 'tsl' | 'tcl' | 'aml';

@Component({
  selector: 'app-filter-bar',
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.css']
})
export class FilterBarComponent implements OnInit {
  filters: FilterState = { tsl: false, tcl: false, aml: false };
  markers = { tsl: ValidationMarkerSummary.zero, tcl: ValidationMarkerSummary.zero, aml: ValidationMarkerSummary.zero };
  @Input() getFilteredOutMarkers: (type: FilterType) => ValidationMarkerSummary;
  @Output() filtersChanged: EventEmitter<FilterState> = new EventEmitter<FilterState>();

  constructor(private changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
  }

  onClick() {
    this.filtersChanged.emit({tsl: this.filters.tsl, tcl: this.filters.tcl, aml: this.filters.aml});
    this.updateFilteredOutMarkers();
  }

  showValidationMarkers(type: FilterType, severity: 'errors' | 'warnings' | 'infos'): boolean {
    switch (severity) {
      case 'infos': return this.markers[type].errors <= 0 && this.markers[type].warnings <= 0 && this.markers[type].infos > 0;
      case 'warnings': return this.markers[type].errors <= 0 && this.markers[type].warnings > 0;
      case 'errors': return this.markers[type].errors > 0;
    }
  }

  private updateFilteredOutMarkers() {
    ['tsl', 'tcl', 'aml'].forEach((type: FilterType) => this.markers[type] = this.getFilteredOutMarkers(type));
    this.changeDetector.detectChanges();
  }

  public getMarkerLabel(type: FilterType): string {
    return this.markers[type].toString();
  }

}
