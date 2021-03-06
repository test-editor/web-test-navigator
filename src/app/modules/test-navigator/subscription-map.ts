import { Subscription } from 'rxjs';

export class SubscriptionMap<T> {
  private subscriptions = new Map<T, Subscription>();

  add(key: T, subscription: Subscription) {
    if (this.subscriptions.has(key)) {
      this.subscriptions.get(key).add(subscription);
    } else {
      this.subscriptions.set(key, subscription);
    }
  }

  remove(key: T) {
    if (this.subscriptions.has(key)) {
      this.subscriptions.get(key).unsubscribe();
      this.subscriptions.delete(key);
    }
  }

  clear() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions.clear();
  }
}
