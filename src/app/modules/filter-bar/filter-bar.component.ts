import { Component, OnInit, Output, EventEmitter } from '@angular/core';

export interface FilterState { tsl: boolean; tcl: boolean; aml: boolean; }

@Component({
  selector: 'app-filter-bar',
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.css']
})
export class FilterBarComponent implements OnInit {
  filters: FilterState = { tsl: false, tcl: false, aml: false };

  @Output() filtersChanged: EventEmitter<FilterState> = new EventEmitter<FilterState>();

  constructor() { }

  ngOnInit() {
  }

  onClick() {
    this.filtersChanged.emit({tsl: this.filters.tsl, tcl: this.filters.tcl, aml: this.filters.aml});
  }

}
