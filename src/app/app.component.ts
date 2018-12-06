import { AfterContentChecked, Component } from '@angular/core';
import { MessagingService } from '@testeditor/messaging-service';
import { USER_ACTIVITY_UPDATED, ElementActivity } from './modules/event-types-in';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterContentChecked {
  title = 'app';

  constructor(private messageBus: MessagingService) {}

  ngAfterContentChecked(): void {
    this.messageBus.publish(USER_ACTIVITY_UPDATED, [
      {element: 'src/test/java/package/TestCase.tcl', activities: [{
        user: 'John Doe',
        type: 'executed.test'}]
      }] as ElementActivity[]);
  }
}
