import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { DatePipe } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { BookCardComponent } from "../components/book-card.component";
import { Book, SubmittedSuggestion } from "../models/book";
import { AuthService } from "../services/auth.service";
import { BookService } from "../services/book.service";
import { getApiErrorMessage } from "../services/api-error";

@Component({
  standalone: true,
  imports: [BookCardComponent, DatePipe, ReactiveFormsModule],
  template: `
    <section class="page-shell catalogue-page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">The PageTurner collection</p>
          <h1>Find your next read.</h1>
          <p class="muted">Search our books or search Open Library for live book records, covers, and publication years. Signed-in readers start with their favorite genre.</p>
        </div>
        <button class="secondary-button" type="button" (click)="loadXml()" [disabled]="xmlBusy()">
          {{ xmlBusy() ? "Reading XML…" : "View XML catalogue" }}
        </button>
      </div>

      <div class="filters panel">
        <form class="search-form" (ngSubmit)="searchLiveBooks()">
          <label for="search">Search title, author, or genre
            <input id="search" name="search" type="search" [value]="query()" (input)="setQuery($event)" placeholder="Try “The Hobbit”">
          </label>
          <button class="secondary-button" type="submit" [disabled]="liveBusy()">
            {{ liveBusy() ? "Searching…" : "Search Open Library" }}
          </button>
        </form>
        <label for="genre-filter">Filter by genre
          <select id="genre-filter" [value]="genre()" (change)="setGenre($event)">
            <option value="">All genres</option>
            <option>Fiction</option>
            <option>Fantasy</option>
            <option>Science</option>
            <option>Personal Growth</option>
          </select>
        </label>
      </div>
      <div class="source-switch" aria-label="Book catalogue source">
        <button type="button" [class.selected]="!liveMode()" [attr.aria-pressed]="!liveMode()" (click)="showSampleBooks()">Sample collection</button>
        <button type="button" [class.selected]="liveMode()" [attr.aria-pressed]="liveMode()" (click)="searchLiveBooks()">Live Open Library</button>
        @if (liveMode() && lastUpdated()) {
          <span class="muted">Updated {{ lastUpdated() | date:"shortTime" }} · Open Library</span>
        }
      </div>
      @if (readerError()) {
        <p class="status error" role="alert">{{ readerError() }}</p>
      }

      @if (liveMode() && liveError()) {
        <p class="status error" role="alert">{{ liveError() }}</p>
        <button type="button" (click)="searchLiveBooks()">Retry live search</button>
      } @else if (!liveMode() && catalogueError()) {
        <p class="status error" role="alert">{{ catalogueError() }}</p>
        <button type="button" (click)="loadJson()">Retry loading sample catalogue</button>
      } @else if ((liveMode() && liveBusy()) || (!liveMode() && loading())) {
        <p class="status muted" role="status">{{ liveMode() ? "Searching Open Library…" : "Loading sample books…" }}</p>
      } @else if (loading()) {
        <p class="status muted" role="status">Loading book recommendations…</p>
      } @else {
        <p class="results-count" aria-live="polite">
          @if (liveMode()) {
            {{ liveTotal() }} live results · showing {{ filteredBooks().length }} · source: Open Library
          } @else {
            {{ filteredBooks().length }} {{ filteredBooks().length === 1 ? "book" : "books" }} found
          }
        </p>
        <section class="book-grid" aria-label="Recommended books">
          @for (book of filteredBooks(); track book.id) {
            <app-book-card [book]="book" />
          } @empty {
            <p class="panel muted">No books match those filters. Try another title or genre.</p>
          }
        </section>
        @if (liveMode() && liveBooks().length < liveTotal()) {
          <button class="load-more" type="button" (click)="loadMoreLiveBooks()" [disabled]="liveBusy()">
            {{ liveBusy() ? "Loading…" : "Load more live books" }}
          </button>
        }
      }

      @if (xmlError()) {
        <p class="status error" role="alert">{{ xmlError() }}</p>
      }
      @if (xmlBooks().length > 0) {
        <section class="xml-panel panel">
          <div>
            <p class="eyebrow">AJAX • XML • DTD</p>
            <h2>Books parsed from XML</h2>
            <p class="muted">Loaded asynchronously from the XML document validated against its DTD.</p>
          </div>
          <ul>
            @for (book of xmlBooks(); track book.id) {
              <li><strong>{{ book.title }}</strong> — {{ book.author }} <span>{{ book.genre }}</span></li>
            }
          </ul>
        </section>
      }

      <section class="suggestion-section">
        <div>
          <p class="eyebrow">Share a discovery</p>
          <h2>Recommend a book to the community.</h2>
          <p class="muted">Your suggestion is sent to the server and added to the current session's list.</p>
          @if (suggestionMessage()) {
            <p class="status success" role="status">{{ suggestionMessage() }}</p>
          }
          @if (suggestionError()) {
            <p class="status error" role="alert">{{ suggestionError() }}</p>
          }
          @if (submittedSuggestions().length) {
            <h3>Recently shared</h3>
            <ul class="suggestions">
              @for (suggestion of submittedSuggestions(); track suggestion.id) {
                <li><strong>{{ suggestion.title }}</strong> by {{ suggestion.author }} · {{ suggestion.genre }} <span class="muted">— {{ suggestion.reader }}</span></li>
              }
            </ul>
          }
        </div>
        <form class="suggestion-form panel" [formGroup]="suggestionForm" (ngSubmit)="submitSuggestion()">
          <label for="reader">Your name
            <input id="reader" formControlName="reader" autocomplete="name">
          </label>
          <label for="book-title">Book title
            <input id="book-title" formControlName="title">
          </label>
          <label for="author">Author
            <input id="author" formControlName="author">
          </label>
          <label for="suggestion-genre">Genre
            <select id="suggestion-genre" formControlName="genre">
              <option value="">Choose a genre</option>
              <option>Fiction</option>
              <option>Fantasy</option>
              <option>Science</option>
              <option>Personal Growth</option>
            </select>
          </label>
          <button type="submit" [disabled]="sending()">{{ sending() ? "Sending…" : "Send recommendation" }}</button>
        </form>
      </section>
    </section>
  `,
  styles: [`
    .catalogue-page { padding-block: 3rem; }
    .page-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1.6rem; }
    h1 { margin: .45rem 0; color: #173f35; }
    h2 { color: #173f35; }
    .secondary-button { border: 1px solid #b8c4bc; background: #fff; color: #173f35; }
    .filters { display: grid; grid-template-columns: 1.4fr .6fr; align-items: end; gap: 1rem; margin-bottom: 1rem; }
    .search-form { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: .65rem; }
    .source-switch { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; margin-block: 1rem; }
    .source-switch button { min-height: 2.3rem; padding: .45rem .8rem; border: 1px solid #c5cec7; background: white; color: #173f35; font-size: .85rem; }
    .source-switch button.selected { border-color: #173f35; background: #173f35; color: white; }
    .source-switch span { margin-left: auto; font-size: .8rem; }
    .results-count { color: #65716d; }
    .book-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr)); gap: 1rem; }
    .xml-panel { display: grid; grid-template-columns: .7fr 1.3fr; gap: 2rem; margin-top: 2rem; }
    .xml-panel h2 { margin: .35rem 0; }
    .xml-panel ul, .suggestions { display: grid; gap: .5rem; padding-left: 1.1rem; }
    .xml-panel li span { color: #176653; font-size: .85rem; }
    .suggestion-section { display: grid; grid-template-columns: 1fr .8fr; gap: 2rem; margin-top: 4rem; padding-top: 2rem; border-top: 1px solid #dedbd2; }
    .suggestion-section h2 { margin: .4rem 0; }
    .suggestion-form { display: grid; gap: .85rem; }
    .suggestions li { color: #35483e; }
    .load-more { display: flex; margin: 1.5rem auto 0; }
    @media (max-width: 44rem) {
      .page-heading { align-items: flex-start; flex-direction: column; }
      .filters, .search-form, .xml-panel, .suggestion-section { grid-template-columns: 1fr; }
      .catalogue-page { padding-block: 2rem; }
    }
  `],
})
export class CatalogueComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly bookService = inject(BookService);
  private readonly auth = inject(AuthService);
  readonly query = signal("");
  readonly genre = signal("");
  readonly loading = signal(true);
  readonly liveMode = signal(false);
  readonly liveBooks = signal<Book[]>([]);
  readonly liveBusy = signal(false);
  readonly liveError = signal("");
  readonly liveTotal = signal(0);
  readonly livePage = signal(0);
  readonly lastUpdated = signal<Date | null>(null);
  readonly catalogueError = signal("");
  readonly readerError = signal("");
  readonly xmlBooks = signal<Book[]>([]);
  readonly xmlError = signal("");
  readonly xmlBusy = signal(false);
  readonly sending = signal(false);
  readonly suggestionMessage = signal("");
  readonly suggestionError = signal("");
  readonly submittedSuggestions = this.bookService.suggestions.asReadonly();
  readonly filteredBooks = computed(() => {
    if (this.liveMode()) {
      const genre = this.genre();
      const search = this.query().trim().toLocaleLowerCase();
      return this.liveBooks().filter((book) =>
        (!genre || book.genre === genre) &&
        `${book.title} ${book.author} ${book.genre}`.toLocaleLowerCase().includes(search),
      );
    }
    return this.bookService.recommend(this.genre(), this.query());
  });
  readonly suggestionForm = this.formBuilder.nonNullable.group({
    reader: ["", [Validators.required, Validators.maxLength(100)]],
    title: ["", [Validators.required, Validators.maxLength(120)]],
    author: ["", [Validators.required, Validators.maxLength(100)]],
    genre: ["", Validators.required],
  });

  ngOnInit(): void {
    void this.loadJson();
    void this.loadReaderPreference();
  }

  async loadReaderPreference(): Promise<void> {
    try {
      await this.auth.restoreSession();
      const reader = this.auth.currentUser();
      if (reader) this.genre.set(reader.genre);
    } catch (error) {
      this.readerError.set(getApiErrorMessage(error));
    }
  }

  setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  setGenre(event: Event): void {
    this.genre.set((event.target as HTMLSelectElement).value);
    if (this.liveMode()) void this.searchLiveBooks();
  }

  showSampleBooks(): void {
    this.liveMode.set(false);
    this.liveError.set("");
  }

  async searchLiveBooks(): Promise<void> {
    this.liveMode.set(true);
    this.liveBusy.set(true);
    this.liveError.set("");
    this.liveBooks.set([]);
    this.livePage.set(1);
    try {
      const result = await this.bookService.searchLiveBooks(this.query(), this.genre(), 1);
      this.liveBooks.set(result.books);
      this.liveTotal.set(result.total);
      this.lastUpdated.set(new Date());
    } catch (error) {
      this.liveError.set(getApiErrorMessage(error));
    } finally {
      this.liveBusy.set(false);
    }
  }

  async loadMoreLiveBooks(): Promise<void> {
    if (this.liveBusy()) return;
    const nextPage = this.livePage() + 1;
    this.liveBusy.set(true);
    this.liveError.set("");
    try {
      const result = await this.bookService.searchLiveBooks(this.query(), this.genre(), nextPage);
      this.liveBooks.update((current) => {
        const knownIds = new Set(current.map((book) => book.id));
        return [...current, ...result.books.filter((book) => !knownIds.has(book.id))];
      });
      this.livePage.set(nextPage);
      this.liveTotal.set(result.total);
      this.lastUpdated.set(new Date());
    } catch (error) {
      this.liveError.set(getApiErrorMessage(error));
    } finally {
      this.liveBusy.set(false);
    }
  }

  async loadJson(): Promise<void> {
    this.loading.set(true);
    this.catalogueError.set("");
    try {
      await Promise.all([this.bookService.loadBooks(), this.bookService.loadSuggestions()]);
    } catch (error) {
      this.catalogueError.set(getApiErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async loadXml(): Promise<void> {
    this.xmlBusy.set(true);
    this.xmlError.set("");
    try {
      this.xmlBooks.set(await this.bookService.loadXmlBooks());
    } catch (error) {
      this.xmlError.set(getApiErrorMessage(error));
    } finally {
      this.xmlBusy.set(false);
    }
  }

  async submitSuggestion(): Promise<void> {
    this.suggestionMessage.set("");
    this.suggestionError.set("");
    if (this.suggestionForm.invalid) {
      this.suggestionForm.markAllAsTouched();
      this.suggestionError.set("Complete all fields before sending your recommendation.");
      return;
    }

    this.sending.set(true);
    try {
      await this.bookService.sendSuggestion(this.suggestionForm.getRawValue());
      this.suggestionMessage.set("Your book recommendation was received. Thank you!");
      this.suggestionForm.reset();
    } catch (error) {
      this.suggestionError.set(getApiErrorMessage(error));
    } finally {
      this.sending.set(false);
    }
  }
}
