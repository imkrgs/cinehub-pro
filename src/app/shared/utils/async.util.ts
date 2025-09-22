// src/app/shared/utils/async.util.ts
import { isObservable, firstValueFrom, from } from 'rxjs';

export async function callAuth<T>(maybeObsOrPromise: Promise<T> | import('rxjs').Observable<T>): Promise<T> {
    if (isObservable(maybeObsOrPromise)) {
        return firstValueFrom(maybeObsOrPromise as any);
    }
    // could be a Promise or raw value
    return Promise.resolve(maybeObsOrPromise as Promise<T>);
}
