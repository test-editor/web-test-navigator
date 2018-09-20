import { SubscriptionMap } from './subscription-map';
import { mock, instance, verify } from 'ts-mockito/lib/ts-mockito';
import { Subscription } from 'rxjs/Subscription';

describe('SubscriptionMap', () => {
  it('should create an instance', () => {
    expect(new SubscriptionMap()).toBeTruthy();
  });

  it('should not unsubscribe when adding subscription', () => {
    // given
    const testKey = 'testKey';
    const mockSubscription = mock(Subscription);
    const subscriptionMap = new SubscriptionMap<string>();

    // when
    subscriptionMap.add(testKey, instance(mockSubscription));

    // then
    verify(mockSubscription.unsubscribe()).never();
    expect().nothing();
  });

  it('should unsubscribe if added subscription is removed again', () => {
    // given
    const testKey = 'testKey';
    const mockSubscription = mock(Subscription);
    const subscriptionMap = new SubscriptionMap<string>();
    subscriptionMap.add(testKey, instance(mockSubscription));

    // when
    subscriptionMap.remove(testKey);

    // then
    verify(mockSubscription.unsubscribe()).called();
    expect().nothing();
  });

  it('should not unsubscribe already removed subscriptions', () => {
    // given
    const testKey = 'testKey';
    const mockSubscription = mock(Subscription);
    const subscriptionMap = new SubscriptionMap<string>();
    subscriptionMap.add(testKey, instance(mockSubscription));

    // when
    subscriptionMap.remove(testKey);
    subscriptionMap.remove(testKey);

    // then
    verify(mockSubscription.unsubscribe()).once();
    expect().nothing();
  });

  it('should add additional subscriptions for the same key to the first one', () => {
    // given
    const testKey = 'testKey';
    const mockSubscription1 = mock(Subscription);
    const mockSubscription2 = mock(Subscription);
    const subscription2 = instance(mockSubscription2);
    const subscriptionMap = new SubscriptionMap<string>();
    subscriptionMap.add(testKey, instance(mockSubscription1));

    // when
    subscriptionMap.add(testKey, subscription2);

    // then
    verify(mockSubscription1.add(subscription2)).called();
    expect().nothing();
  });

  it('should only unsubscribe subscriptions added for the given key on remove', () => {
    // given
    const testKey = 'testKey';
    const otherKey = 'otherKey';
    const mockSubscription1 = mock(Subscription);
    const mockSubscription2 = mock(Subscription);
    const subscriptionMap = new SubscriptionMap<string>();
    subscriptionMap.add(testKey, instance(mockSubscription1));
    subscriptionMap.add(otherKey, instance(mockSubscription2));

    // when
    subscriptionMap.remove(testKey);

    // then
    verify(mockSubscription1.unsubscribe()).called();
    verify(mockSubscription2.unsubscribe()).never();
    expect().nothing();
  });

  it('should unsubscribe all on clear', () => {
    // given
    const testKey = 'testKey';
    const otherKey = 'otherKey';
    const mockSubscription1 = mock(Subscription);
    const mockSubscription2 = mock(Subscription);
    const mockSubscription3 = mock(Subscription);
    const subscriptionMap = new SubscriptionMap<string>();
    subscriptionMap.add(testKey, instance(mockSubscription1));
    subscriptionMap.add(testKey, instance(mockSubscription2));
    subscriptionMap.add(otherKey, instance(mockSubscription3));

    // when
    subscriptionMap.clear();

    // then
    verify(mockSubscription1.unsubscribe()).called();
    verify(mockSubscription3.unsubscribe()).called();
    expect().nothing();
  });
});
