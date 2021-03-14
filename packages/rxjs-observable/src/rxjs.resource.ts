import { RxJsFacade } from '@slickgrid-universal/common';
import { EMPTY, iif, isObservable, Observable, OperatorFunction, Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';

export class RxJsResource implements RxJsFacade {
  readonly className = 'RxJsResource';

  /**
   * The same Observable instance returned by any call to without a scheduler.
   * This returns the EMPTY constant from RxJS
   */
  get EMPTY(): Observable<never> {
    return EMPTY;
  }

  /** Simple method to create an Observable */
  createObservable<T>(): Observable<T> {
    return new Observable<T>();
  }

  /** Simple method to create an Subject */
  createSubject<T>(): Subject<T> {
    return new Subject<T>();
  }

  first<T, D = T>(predicate?: null, defaultValue?: D): OperatorFunction<T, T | D> {
    return first(predicate, defaultValue);
  }

  iif<T = never, F = never>(condition: () => boolean, trueResult?: any, falseResult?: any): Observable<T | F> {
    return iif<T, F>(condition, trueResult, falseResult);
  }

  /** Tests to see if the object is an RxJS Observable */
  isObservable<T>(obj: any): boolean {
    return isObservable<T>(obj);
  }

  /** Emits the values emitted by the source Observable until a `notifier` Observable emits a value. */
  takeUntil<T>(notifier: Observable<any>): any {
    return takeUntil<T>(notifier);
  }
}