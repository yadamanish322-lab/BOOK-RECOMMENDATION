import { Component, input } from "@angular/core";
import { Book } from "../models/book";

@Component({
  selector: "app-book-card",
  standalone: true,
  template: `
    <article class="book-card">
      @if (book().coverUrl) {
        <img class="book-cover" [src]="book().coverUrl" [alt]="'Cover of ' + book().title" loading="lazy" (error)="hideBrokenCover($event)">
      } @else {
        <div class="book-cover cover-placeholder" aria-hidden="true">{{ initials() }}</div>
      }
      <div class="book-copy">
        <span class="genre">{{ book().genre }}</span>
        <h3>
          @if (book().openLibraryUrl) {
            <a [href]="book().openLibraryUrl" target="_blank" rel="noopener noreferrer">{{ book().title }}</a>
          } @else {
            {{ book().title }}
          }
        </h3>
        <p class="author">by {{ book().author }}</p>
        @if (book().averageRating !== undefined) {
          <p class="rating" aria-label="Sample reader rating">
            <span aria-hidden="true">★</span> {{ book().averageRating }} <small>/ 5 sample rating</small>
          </p>
        }
        @if (book().firstPublishedYear) {
          <p class="published">First published {{ book().firstPublishedYear }}</p>
        }
        <p class="description">{{ book().description }}</p>
      </div>
    </article>
  `,
  styles: [`
    .book-card { display: grid; grid-template-columns: 4.5rem 1fr; gap: 1rem; min-height: 13rem; padding: 1.2rem; border: 1px solid #e5e1d8; border-radius: .9rem; background: #fff; transition: transform .18s ease, box-shadow .18s ease; }
    .book-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px #173f3512; }
    .book-cover { display: block; width: 100%; aspect-ratio: 3 / 4; border-radius: .45rem .8rem .8rem .45rem; object-fit: cover; box-shadow: 0 5px 12px #173f3520; }
    .cover-placeholder { display: grid; place-items: center; background: linear-gradient(145deg, #173f35, #39745f); box-shadow: inset 5px 0 #ffffff26; color: #fff; font-family: "Playfair Display", Georgia, serif; font-size: 1.2rem; }
    .book-copy { align-self: center; }
    h3 { margin: .5rem 0 .25rem; color: #173f35; font-size: 1.2rem; }
    p { margin: .4rem 0; }
    .genre { color: #9a4e31; font-size: .7rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
    .author, .description { color: #65716d; font-size: .88rem; }
    .rating { color: #8a5a16; font-size: .9rem; font-weight: 700; }
    .rating span { color: #c18424; }
    .rating small { color: #65716d; font-size: .72rem; font-weight: 500; }
    .published { color: #65716d; font-size: .78rem; }
    h3 a { color: inherit; text-decoration-color: #b75b36; text-underline-offset: .18em; }
  `],
})
export class BookCardComponent {
  readonly book = input.required<Book>();

  initials(): string {
    return this.book().title.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  }

  hideBrokenCover(event: Event): void {
    (event.currentTarget as HTMLImageElement).hidden = true;
  }
}
