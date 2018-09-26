import { Injectable } from '@angular/core';
import { ValidationMarkerData } from './modules/validation-marker-summary/validation-marker-summary';
import { ValidationMarkerService } from './modules/validation-marker-service/validation-marker.service';

@Injectable()
export class ValidationMarkerServiceMock extends ValidationMarkerService {

  public async getAllMarkerSummaries(): Promise<Map<string, ValidationMarkerData>> {
    const resultMap = new Map<string, ValidationMarkerData>();
    resultMap.set('src/test/java/package/TestSpec.tsl', {errors: 0, warnings: 0, infos: 1});
    resultMap.set('src/test/java/package/TestCase.tcl', {errors: 0, warnings: 2, infos: 3});
    resultMap.set('src/test/java/package/TestMacros.tml', {errors: 3, warnings: 1, infos: 2});
    resultMap.set('src/test/java/package/TestConfig.config', {errors: 1, warnings: 3, infos: 2});
    resultMap.set('src/test/java/package/subpackage/Täst.tcl', {errors: 4, warnings: 5, infos: 6});
    return Promise.resolve(resultMap);
  }
}
