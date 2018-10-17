import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
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
  @Input() getFilteredOutMarkers: (type: FilterType) => ValidationMarkerSummary;
  @Output() filtersChanged: EventEmitter<FilterState> = new EventEmitter<FilterState>();

  constructor() { }

  ngOnInit() {
  }

  onClick() {
    this.filtersChanged.emit({tsl: this.filters.tsl, tcl: this.filters.tcl, aml: this.filters.aml});
  }

  showValidationMarkers(type: FilterType, severity: 'errors' | 'warnings' | 'infos'): boolean {
    const markers = this.getFilteredOutMarkers(type);
    switch (severity) {
      case 'infos': return markers.errors <= 0 && markers.warnings <= 0 && markers.infos > 0;
      case 'warnings': return markers.errors <= 0 && markers.warnings > 0;
      case 'errors': return markers.errors > 0;
    }
  }

}
