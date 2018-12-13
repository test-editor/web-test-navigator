import { CompositeUserActivitySet } from "./user-activity-set";

describe('CompositeUserActivitySet', () => {
  describe('getTypes', () => {
    it('should return an empty list if the provided element is not known to the set', () => {
      // given
      const activtySetUnderTest = new CompositeUserActivitySet();

      // when
      const actualTypes = activtySetUnderTest.getTypes('arbitrary unknown element');

      // then
      expect(actualTypes).toBeTruthy();
      expect(actualTypes.length).toEqual(0);
    });
  });

  describe('getUsers', () => {
    it('should return an empty list if the provided element is not known to the set', () => {
      // given
      const activtySetUnderTest = new CompositeUserActivitySet();

      // when
      const actualTypes = activtySetUnderTest.getUsers('arbitrary activity', 'arbitrary unknown element');

      // then
      expect(actualTypes).toBeTruthy();
      expect(actualTypes.length).toEqual(0);
    });
  });

});
