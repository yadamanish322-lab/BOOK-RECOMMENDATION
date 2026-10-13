import { Component, inject, OnInit, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { getApiErrorMessage } from "../services/api-error";

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="page-shell profile-page">
      @if (loadingSession()) {
        <div class="profile-card panel"><p role="status">Loading your reader profile…</p></div>
      } @else if (auth.currentUser(); as reader) {
        <div class="profile-card panel">
          <div class="avatar" aria-hidden="true">{{ reader.fullName.slice(0, 1).toUpperCase() }}</div>
          <p class="eyebrow">Your PageTurner account</p>
          <h1>Hello, {{ reader.fullName }}.</h1>
          <p class="muted">{{ reader.email }} · &#64;{{ reader.username }}</p>
          <form [formGroup]="form" (ngSubmit)="save()">
            <label for="genre">Your favorite genre
              <select id="genre" formControlName="genre">
                <option>Fiction</option>
                <option>Fantasy</option>
                <option>Science</option>
                <option>Personal Growth</option>
              </select>
            </label>
            <button type="submit" [disabled]="busy()">{{ busy() ? "Saving…" : "Update preference" }}</button>
          </form>
          @if (message()) { <p class="status success" role="status">{{ message() }}</p> }
        </div>
      } @else {
        <div class="profile-card panel">
          <p class="eyebrow">Reader profile</p>
          <h1>You are browsing as a guest.</h1>
          <p class="muted">Create an account to save your favorite genre and make your recommendations personal.</p>
          <a class="button-link" routerLink="/register">Create a reader profile</a>
        </div>
      }
      @if (error()) { <p class="status error" role="alert">{{ error() }}</p> }
    </section>
  `,
  styles: [`
    .profile-page { display: grid; min-height: 28rem; place-items: center; padding-block: 3rem; }
    .profile-card { width: min(100%, 36rem); }
    .avatar { display: grid; width: 3.5rem; aspect-ratio: 1; place-items: center; border-radius: 50%; background: #e3efe9; color: #173f35; font: 700 1.5rem "Playfair Display", Georgia, serif; }
    h1 { color: #173f35; }
    form { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 1rem; margin-top: 2rem; }
    @media (max-width: 34rem) { form { grid-template-columns: 1fr; } }
  `],
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  readonly busy = signal(false);
  readonly loadingSession = signal(true);
  readonly message = signal("");
  readonly error = signal("");
  readonly form = this.formBuilder.nonNullable.group({
    genre: [this.auth.currentUser()?.genre || "Fiction", Validators.required],
  });

  ngOnInit(): void {
    void this.auth.restoreSession()
      .then(() => {
        const reader = this.auth.currentUser();
        if (reader) this.form.controls.genre.setValue(reader.genre);
      })
      .catch((error: unknown) => this.error.set(getApiErrorMessage(error)))
      .finally(() => this.loadingSession.set(false));
  }

  async save(): Promise<void> {
    this.message.set("");
    this.error.set("");
    if (this.form.invalid) return;
    if (!this.auth.currentUser()) {
      this.error.set("Log in before updating your preferences.");
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.updateGenre(this.form.getRawValue().genre);
      this.message.set("Your favorite genre was updated.");
    } catch (error) {
      this.error.set(getApiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
