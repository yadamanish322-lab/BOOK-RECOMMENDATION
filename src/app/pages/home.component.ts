import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { BookCardComponent } from "../components/book-card.component";
import { AuthService } from "../services/auth.service";
import { BookService } from "../services/book.service";
import { getApiErrorMessage } from "../services/api-error";

@Component({
  standalone: true,
  imports: [BookCardComponent, RouterLink],
  template: `
    <main class="dashboard page-shell">
      <section class="welcome">
        <div>
          <p class="eyebrow">Your reading dashboard</p>
          <h1>Welcome back, {{ firstName() }}.</h1>
          <p class="intro">A few thoughtful picks for a reader who loves {{ favoriteGenre() }}.</p>
        </div>
        <a class="button-link" routerLink="/books">Explore all books <span aria-hidden="true">→</span></a>
      </section>

      <section class="summary" aria-label="Your reading snapshot">
        <article class="summary-card">
          <span class="summary-icon" aria-hidden="true">✦</span>
          <div><p class="summary-label">Your genre</p><strong>{{ favoriteGenre() }}</strong></div>
        </article>
        <article class="summary-card">
          <span class="summary-icon" aria-hidden="true">▤</span>
          <div><p class="summary-label">Books picked for you</p><strong>{{ recommendations().length }} recommendations</strong></div>
        </article>
        <article class="summary-card">
          <span class="summary-icon star" aria-hidden="true">★</span>
          <div><p class="summary-label">Top sample rating</p><strong>{{ topRating() }}</strong></div>
        </article>
      </section>

      <section class="recommendations">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Picked for your taste</p>
            <h2>Recommended for you</h2>
            <p class="muted">A short list based on your favorite genre, with a quick synopsis and sample reader rating.</p>
          </div>
          <a class="text-link" routerLink="/profile">Update your preferences <span aria-hidden="true">→</span></a>
        </div>

        @if (loading()) {
          <p class="panel muted" role="status">Finding books you might enjoy…</p>
        } @else if (error()) {
          <p class="status error" role="alert">{{ error() }}</p>
          <button type="button" (click)="loadRecommendations()">Try again</button>
        } @else {
          <div class="book-grid">
            @for (book of recommendations(); track book.id) {
              <app-book-card [book]="book" />
            } @empty {
              <p class="panel muted">No recommendations are available for this genre yet. Browse all books to discover something new.</p>
            }
          </div>
        }
      </section>
    </main>
  `,
  styles: [`
    .dashboard { padding-block: 2.5rem 4rem; }
    .welcome { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; padding: clamp(1.5rem, 4vw, 3rem); border-radius: 1.2rem; background: linear-gradient(115deg, #e8eee5, #f4eee2); }
    .welcome h1 { margin: .4rem 0; color: #173f35; }
    .intro { margin-bottom: 0; color: #52645b; font-size: 1.05rem; }
    .welcome .button-link { flex: 0 0 auto; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-block: 1.3rem 3rem; }
    .summary-card { display: flex; align-items: center; gap: .9rem; padding: 1.2rem; border: 1px solid #e2dfd7; border-radius: .9rem; background: white; }
    .summary-icon { display: grid; width: 2.7rem; aspect-ratio: 1; place-items: center; border-radius: .75rem; background: #e8eee5; color: #176653; font-size: 1.2rem; }
    .summary-icon.star { background: #f7eddc; color: #b57920; }
    .summary-label { margin: 0 0 .25rem; color: #65716d; font-size: .8rem; }
    .summary-card strong { color: #173f35; }
    .section-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1.2rem; }
    .section-heading h2 { margin: .3rem 0; color: #173f35; }
    .section-heading .muted { margin-block: .4rem 0; }
    .text-link { flex: 0 0 auto; color: #176653; font-weight: 700; text-decoration: none; }
    .book-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr)); gap: 1rem; }
    @media (max-width: 42rem) {
      .welcome, .section-heading { align-items: flex-start; flex-direction: column; }
      .summary { grid-template-columns: 1fr; margin-bottom: 2rem; }
    }
  `],
})
export class HomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly bookService = inject(BookService);
  readonly loading = signal(true);
  readonly error = signal("");
  readonly favoriteGenre = computed(() => this.auth.currentUser()?.genre ?? "Fiction");
  readonly firstName = computed(() => this.auth.currentUser()?.fullName.split(/\s+/)[0] ?? "reader");
  readonly recommendations = computed(() =>
    this.bookService.recommend(this.favoriteGenre()).slice(0, 4),
  );
  readonly topRating = computed(() => {
    const best = this.recommendations()
      .map((book) => book.averageRating)
      .filter((rating): rating is number => rating !== undefined)
      .reduce((highest, rating) => Math.max(highest, rating), 0);
    return best ? `${best.toFixed(1)} / 5` : "Not rated yet";
  });

  ngOnInit(): void {
    void this.loadRecommendations();
  }

  async loadRecommendations(): Promise<void> {
    this.loading.set(true);
    this.error.set("");
    try {
      await this.bookService.loadBooks();
    } catch (error) {
      this.error.set(getApiErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
