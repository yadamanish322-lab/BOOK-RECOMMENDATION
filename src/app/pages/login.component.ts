import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { getApiErrorMessage } from "../services/api-error";

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="login-wrap page-shell">
      <div class="panel login-panel">
        <p class="eyebrow">Welcome back</p>
        <h1>Pick up where your next story begins.</h1>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label for="username">Username
            <input id="username" formControlName="username" autocomplete="username">
          </label>
          @if (form.controls.username.touched && form.controls.username.invalid) {
            <small class="error">Enter your username.</small>
          }
          <label for="password">Password
            <input id="password" formControlName="password" type="password" autocomplete="current-password">
          </label>
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <small class="error">Enter your password.</small>
          }
          @if (error()) { <p class="status error" role="alert">{{ error() }}</p> }
          <button type="submit" [disabled]="busy()">{{ busy() ? "Checking…" : "Log in" }}</button>
        </form>
        <p class="auth-switch">New to PageTurner? <a routerLink="/register">Create your reader profile</a></p>
      </div>
      <div class="login-art" aria-hidden="true"><span>Once upon<br>your next read…</span></div>
    </section>
  `,
  styles: [`
    .login-wrap { display: grid; grid-template-columns: 1fr .8fr; align-items: center; gap: 3rem; padding-block: 4rem; }
    .login-panel { width: 100%; max-width: 34rem; }
    h1 { color: #173f35; font-size: clamp(2rem, 4vw, 3rem); }
    form { display: grid; gap: 1rem; margin-block: 1.5rem; }
    form button { margin-top: .5rem; }
    .auth-switch { color: #65716d; }
    .login-art { display: grid; min-height: 24rem; place-items: center; border-radius: 1.2rem; background: radial-gradient(circle at 65% 25%, #e4b974 0 15%, transparent 15.5%), linear-gradient(145deg, #dfe9de, #cad8c8); color: #173f35; text-align: center; }
    .login-art span { font: 700 clamp(2rem, 4vw, 3.5rem)/1.2 "Playfair Display", Georgia, serif; transform: rotate(-5deg); }
    @media (max-width: 45rem) { .login-wrap { grid-template-columns: 1fr; padding-block: 2rem; } .login-art { min-height: 15rem; } }
  `],
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly busy = signal(false);
  readonly error = signal("");
  private readonly router = inject(Router);
  readonly form = this.formBuilder.nonNullable.group({
    username: ["", Validators.required],
    password: ["", Validators.required],
  });

  async submit(): Promise<void> {
    this.error.set("");
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.login(this.form.getRawValue());
      await this.router.navigateByUrl("/dashboard");
    } catch (error) {
      this.error.set(getApiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
