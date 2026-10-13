import { Routes } from "@angular/router";
import { CatalogueComponent } from "./pages/catalogue.component";
import { HomeComponent } from "./pages/home.component";
import { LoginComponent } from "./pages/login.component";
import { ProfileComponent } from "./pages/profile.component";
import { RegisterComponent } from "./pages/register.component";
import { authGuard, entryGuard } from "./services/auth.guard";

export const routes: Routes = [
  { path: "", component: LoginComponent, canActivate: [entryGuard], pathMatch: "full", title: "PageTurner" },
  { path: "dashboard", component: HomeComponent, canActivate: [authGuard], title: "PageTurner | Dashboard" },
  { path: "books", component: CatalogueComponent, canActivate: [authGuard], title: "PageTurner | Book catalogue" },
  { path: "register", component: RegisterComponent, title: "PageTurner | Create account" },
  { path: "login", component: LoginComponent, title: "PageTurner | Log in" },
  { path: "profile", component: ProfileComponent, canActivate: [authGuard], title: "PageTurner | Reader profile" },
  { path: "**", redirectTo: "login" },
];
