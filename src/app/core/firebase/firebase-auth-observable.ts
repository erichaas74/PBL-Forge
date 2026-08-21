import { Auth, onAuthStateChanged, User } from 'firebase/auth';
import { Observable } from 'rxjs';

export function observeAuthState(auth: Auth): Observable<User | null> {
  return new Observable((subscriber) =>
    onAuthStateChanged(
      auth,
      (user) => subscriber.next(user),
      (error) => subscriber.error(error),
      () => subscriber.complete(),
    ),
  );
}
