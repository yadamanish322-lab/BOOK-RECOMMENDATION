import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./auth.service";

export const entryGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.currentUser()) await auth.restoreSession();
  return router.parseUrl(auth.currentUser() ? "/dashboard" : "/login");
};

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.currentUser()) return true;
  await auth.restoreSession();
  return auth.currentUser()
    ? true
    : router.createUrlTree(["/login"], { queryParams: { returnUrl: state.url } });
};
