export interface ValidationMarkerData {
  errors: number;
  warnings: number;
  infos: number;
}

export class ValidationMarkerSummary implements ValidationMarkerData {
  static zero = new ValidationMarkerSummary({ errors: 0, warnings: 0, infos: 0 });

  readonly errors: number;
  readonly warnings: number;
  readonly infos: number;
  private label: string;

  constructor(values: ValidationMarkerData = ValidationMarkerSummary.zero) {
    this.errors = values.errors;
    this.warnings = values.warnings;
    this.infos = values.infos;
  }

  add(summand: ValidationMarkerData): ValidationMarkerSummary {
    return new ValidationMarkerSummary({
      errors: this.errors + summand.errors,
      warnings: this.warnings + summand.warnings,
      infos: this.infos + summand.infos
    });
  }

  subtract(summand: ValidationMarkerData): ValidationMarkerSummary {
    return new ValidationMarkerSummary({
      errors: this.errors - summand.errors,
      warnings: this.warnings - summand.warnings,
      infos: this.infos - summand.infos
    });
  }

  negate(): ValidationMarkerSummary {
    return new ValidationMarkerSummary({
      errors: -this.errors,
      warnings: -this.warnings,
      infos: -this.infos
    });
  }

  toString(): string {
    if (!this.label) {
      const labelElements: string[] = [];
      if (this.errors > 0) {
        labelElements.push(`${this.errors} error(s)`);
      }
      if (this.warnings > 0) {
        labelElements.push(`${this.warnings} warning(s)`);
      }
      if (this.infos > 0) {
        labelElements.push(`${this.infos} info(s)`);
      }
      this.label = labelElements.join(', ');
    }
    return this.label;
  }
}
