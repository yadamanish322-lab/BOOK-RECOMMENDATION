import { Component, inject, signal } from "@angular/core";
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { getApiErrorMessage } from "../services/api-error";

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  return control.get("password")?.value === control.get("confirmPassword")?.value
    ? null
    : { passwordsMismatch: true };
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-wrap page-shell">
      <div class="auth-aside">
        <p class="eyebrow">A profile made for you</p>
        <h1>Make room for more good reads.</h1>
        <p>Choose a favorite genre and we will help you find a story to settle into.</p>
      </div>
      <div class="panel auth-panel">
        <p class="eyebrow">Join PageTurner</p>
        <h2>Create your reader profile</h2>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label for="full-name">Full name
            <input id="full-name" formControlName="fullName" autocomplete="name">
          </label>
          @if (invalid("fullName")) { <small class="error">Enter your name (up to 100 characters).</small> }
          <label for="email">Email
            <input id="email" formControlName="email" type="email" autocomplete="email">
          </label>
          @if (invalid("email")) { <small class="error">Enter a valid email address.</small> }
          <label for="username">Username
            <input id="username" formControlName="username" autocomplete="username">
          </label>
          @if (invalid("username")) { <small class="error">Use 3–30 letters, numbers, or underscores.</small> }
          <label for="genre">Favorite genre
            <select id="genre" formControlName="genre">
              <option value="">Choose a genre</option>
              <option>Fiction</option>
              <option>Fantasy</option>
              <option>Science</option>
              <option>Personal Growth</option>
            </select>
          </label>
          @if (invalid("genre")) { <small class="error">Choose a favorite genre.</small> }
          <label for="password">Password
            <input id="password" formControlName="password" type="password" autocomplete="new-password">
          </label>
          @if (invalid("password")) { <small class="error">Password must be at least 8 characters.</small> }
          <label for="confirm-password">Confirm password
            <input id="confirm-password" formControlName="confirmPassword" type="password" autocomplete="new-password">
          </label>
          @if (form.touched && form.hasError("passwordsMismatch")) { <small class="error">Passwords must match.</small> }
          @if (error()) { <p class="status error" role="alert">{{ error() }}</p> }
          <button type="submit" [disabled]="busy()">{{ busy() ? "Creating profile…" : "Create account" }}</button>
        </form>
        <p class="auth-switch">Already a reader? <a routerLink="/login">Log in</a></p>
      </div>
    </section>
  `,
  styles: [`
    .auth-wrap { display: grid; grid-template-columns: .8fr 1fr; align-items: center; gap: clamp(2rem, 7vw, 6rem); padding-block: 3rem; }
    .auth-aside h1 { color: #173f35; font-size: clamp(2.5rem, 5vw, 4rem); }
    .auth-aside p:last-child { max-width: 25rem; color: #65716d; font-size: 1.05rem; }
    .auth-panel { width: 100%; max-width: 34rem; justify-self: end; }
    .auth-panel h2 { margin: .35rem 0 1.3rem; color: #173f35; }
    form { display: grid; gap: .8rem; }
    form button { margin-top: .5rem; }
    small { margin-top: -.6rem; }
    .auth-switch { margin-bottom: 0; color: #65716d; }
    @media (max-width: 48rem) { .auth-wrap { grid-template-columns: 1fr; gap: 1rem; } .auth-panel { justify-self: stretch; } }
  `],
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal("");
  readonly form = this.formBuilder.nonNullable.group({
    fullName: ["", [Validators.required, Validators.maxLength(100)]],
    email: ["", [Validators.required, Validators.email, Validators.maxLength(254)]],
    username: ["", [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]{3,30}$/)]],
    genre: ["", Validators.required],
    password: ["", [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirmPassword: ["", Validators.required],
  }, { validators: passwordsMatch });

  invalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  async submit(): Promise<void> {
    this.error.set("");
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    try {
      const { fullName, email, username, genre, password } = this.form.getRawValue();
      await this.auth.register({ fullName, email, username, genre, password });
      await this.router.navigateByUrl("/dashboard");
    } catch (error) {
      this.error.set(getApiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
