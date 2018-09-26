import { ValidationMarkerSummary } from './validation-marker-summary';

describe('ValidationMarkerSummary', () => {
  it('should create an instance', () => {
    expect(new ValidationMarkerSummary({errors: 42, warnings: 23, infos: 3})).toBeTruthy();
  });

  describe('add', () => {
    it('should return the sum of the object\'s values and the provided validation marker summary', () => {
      // given
      const existingMarker = new ValidationMarkerSummary({errors: 2, warnings: 4, infos: 8});

      // when
      const sumMarker = existingMarker.add({errors: 16, warnings: 32, infos: 64});

      // then
      expect(sumMarker.errors).toEqual(18);
      expect(sumMarker.warnings).toEqual(36);
      expect(sumMarker.infos).toEqual(72);
    });
  });

  describe('subtract', () => {
    it('should return the difference of the object\'s values and the provided validation marker summary', () => {
      // given
      const existingMarker = new ValidationMarkerSummary({errors: 1, warnings: 2, infos: 3});

      // when
      const differenceMarker = existingMarker.subtract({errors: 3, warnings: 1, infos: -2});

      // then
      expect(differenceMarker.errors).toEqual(-2);
      expect(differenceMarker.warnings).toEqual(1);
      expect(differenceMarker.infos).toEqual(5);
    });
  });

  describe('negate', () => {
    it('should return the additive inverse of the object\'s values', () => {
      // given
      const existingMarker = new ValidationMarkerSummary({errors: 11, warnings: -2, infos: 0});

      // when
      const negatedMarker = existingMarker.negate();

      // then
      expect(negatedMarker.errors).toEqual(-11);
      expect(negatedMarker.warnings).toEqual(2);
      expect(negatedMarker.infos === 0).toBeTruthy(); // -0 and 0 are separate entities in JS
                                                      // Jasmine's toEqual distinguishes them, while -0 === 0 evaluates to true.
    });
  });
});
