import { Component, inject, signal } from "@angular/core";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "./services/auth.service";
import { getApiErrorMessage } from "./services/api-error";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header class="site-header">
      <div class="page-shell header-inner">
        <a class="brand" routerLink="/dashboard" aria-label="PageTurner home">
          <span class="brand-mark" aria-hidden="true">P</span>
          <span>PageTurner <small>BOOKS & READERS</small></span>
        </a>
        <nav aria-label="Main navigation">
          @if (auth.currentUser(); as reader) {
            <a routerLink="/dashboard" routerLinkActive="active">Home</a>
            <a routerLink="/books" routerLinkActive="active">Discover books</a>
            <a routerLink="/profile" routerLinkActive="active">Hi, {{ reader.fullName }}</a>
            <button class="nav-button" type="button" (click)="logout()" [disabled]="busy()">Log out</button>
          } @else {
            <a routerLink="/login" routerLinkActive="active">Log in</a>
            <a class="nav-signup" routerLink="/register">Join free</a>
          }
        </nav>
      </div>
    </header>
    @if (sessionError()) {
      <p class="page-shell status error" role="alert">{{ sessionError() }}</p>
    }
    <router-outlet />
    <footer class="site-footer">
      <div class="page-shell footer-inner">
        <a class="brand footer-brand" routerLink="/dashboard">PageTurner</a>
        <p>Thoughtful recommendations for your next favorite book.</p>
      </div>
    </footer>
  `,
  styles: [`
    .site-header { position: sticky; top: 0; z-index: 2; border-bottom: 1px solid #e7e3db; background: #fffefaee; backdrop-filter: blur(12px); }
    .header-inner, nav, .brand, .footer-inner { display: flex; align-items: center; }
    .header-inner { min-height: 5rem; justify-content: space-between; gap: 1rem; }
    .brand { gap: .65rem; color: #173f35; font-family: "Playfair Display", Georgia, serif; font-size: 1.3rem; font-weight: 700; text-decoration: none; }
    .brand small { display: block; color: #758079; font: 600 .55rem "DM Sans", sans-serif; letter-spacing: .14em; }
    .brand-mark { display: grid; width: 2.4rem; height: 2.4rem; place-items: center; border-radius: .7rem; background: #173f35; color: white; }
    nav { gap: clamp(.65rem, 2vw, 1.5rem); }
    nav a { color: #3c4b45; font-size: .92rem; text-decoration: none; }
    nav a.active { color: #176653; font-weight: 700; }
    nav .nav-signup { padding: .55rem .85rem; border-radius: .5rem; background: #173f35; color: white; font-weight: 700; }
    .nav-button { min-height: 2.2rem; padding: .35rem .65rem; background: transparent; color: #3c4b45; font-size: .9rem; }
    .site-footer { margin-top: 4rem; padding: 1.5rem 0; border-top: 1px solid #e2dfd7; color: #65716d; }
    .footer-inner { justify-content: space-between; gap: 1rem; }
    .footer-brand { font-size: 1.05rem; }
    @media (max-width: 42rem) {
      .header-inner { align-items: flex-start; flex-direction: column; padding-block: .9rem; }
      nav { width: 100%; flex-wrap: wrap; }
      nav a { font-size: .85rem; }
      .footer-inner { align-items: flex-start; flex-direction: column; }
    }
  `],
})
export class AppComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly sessionError = signal("");

  async logout(): Promise<void> {
    this.busy.set(true);
    this.sessionError.set("");
    try {
      await this.auth.logout();
      await this.router.navigateByUrl("/login");
    } catch (error) {
      this.sessionError.set(getApiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
