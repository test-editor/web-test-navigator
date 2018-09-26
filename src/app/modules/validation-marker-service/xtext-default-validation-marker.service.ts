import { Injectable } from '@angular/core';
import { HttpProviderService } from '../http-provider-service/http-provider.service';
import { ValidationMarkerData } from '../validation-marker-summary/validation-marker-summary';
import { ValidationMarkerService, ValidationSummary } from './validation-marker.service';
import { ValidationMarkerServiceConfig } from './validation-marker.service.config';

@Injectable()
export class XtextDefaultValidationMarkerService extends ValidationMarkerService {

  constructor(private httpProvider: HttpProviderService, config: ValidationMarkerServiceConfig) {
    super(config);
  }

  public async getAllMarkerSummaries(): Promise<Map<string, ValidationMarkerData>> {
    const resultMap = new Map<string, ValidationMarkerData>();
    try {
      const http = await this.httpProvider.getHttpClient();
      const response = await http.get<ValidationSummary[]>(this.serviceUrl).toPromise();
      response.forEach((markerData: ValidationSummary) => resultMap.set(markerData.path, markerData));
    } catch (error) {
      console.log(error);
    }
    return resultMap;
  }
}
