import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { Book, BookSuggestion, LiveBookSearch, SubmittedSuggestion } from "../models/book";
import { BookRecommendationEngine } from "./recommendation-engine";

@Injectable({ providedIn: "root" })
export class BookService {
  private readonly http = inject(HttpClient);
  private readonly recommendationEngine = new BookRecommendationEngine();
  readonly books = signal<Book[]>([]);
  readonly suggestions = signal<SubmittedSuggestion[]>([]);

  async loadBooks(): Promise<Book[]> {
    const books = await firstValueFrom(this.http.get<Book[]>("/api/books"));
    if (!Array.isArray(books) || books.some((book) =>
      !book.id || !book.title || !book.author || !book.genre || !book.description)) {
      throw new Error("The book catalogue response is incomplete.");
    }
    this.books.set(books);
    return books;
  }

  async searchLiveBooks(query: string, genre: string, page: number): Promise<LiveBookSearch> {
    const params = new URLSearchParams({ page: String(page) });
    if (query.trim()) params.set("q", query.trim());
    if (genre) params.set("genre", genre);
    const result = await firstValueFrom(
      this.http.get<LiveBookSearch>(`/api/live-books?${params.toString()}`),
    );
    if (!Array.isArray(result.books) || !Number.isInteger(result.total) ||
        result.books.some((book) => !book.id || !book.title || !book.author || !book.openLibraryUrl)) {
      throw new Error("The live book search returned an invalid response.");
    }
    return result;
  }

  async loadSuggestions(): Promise<SubmittedSuggestion[]> {
    const suggestions = await firstValueFrom(
      this.http.get<SubmittedSuggestion[]>("/api/recommendations"),
    );
    if (!Array.isArray(suggestions)) {
      throw new Error("The recommendation list response is invalid.");
    }
    this.suggestions.set(suggestions);
    return suggestions;
  }

  recommend(genre: string, query = ""): Book[] {
    const reader = genre ? { genre } : null;
    return this.recommendationEngine.recommend(this.books(), reader, query);
  }

  async loadBookOfTheDay(): Promise<string> {
    return firstValueFrom(this.http.get("/api/books/text", { responseType: "text" }));
  }

  async loadXmlBooks(): Promise<Book[]> {
    const xmlText = await firstValueFrom(this.http.get("/api/books.xml", { responseType: "text" }));
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    if (xml.querySelector("parsererror")) {
      throw new Error("The book XML response could not be parsed.");
    }
    const nodes = [...xml.querySelectorAll("books > book")];
    if (nodes.length === 0) {
      throw new Error("The book XML response did not contain any books.");
    }
    const books = nodes.map((node): Book => {
      const value = (name: string): string => node.querySelector(name)?.textContent?.trim() || "";
      return {
        id: node.getAttribute("id") || "",
        title: value("title"),
        author: value("author"),
        genre: value("genre"),
        description: value("description"),
      };
    });
    if (books.some((book) => !book.id || !book.title || !book.author || !book.genre)) {
      throw new Error("The book XML contains an incomplete book record.");
    }
    return books;
  }

  async sendSuggestion(suggestion: BookSuggestion): Promise<SubmittedSuggestion> {
    const result = await firstValueFrom(this.http.post<{
      message: string;
      suggestion: SubmittedSuggestion;
    }>("/api/recommendations", suggestion));
    this.suggestions.update((items) => [result.suggestion, ...items]);
    return result.suggestion;
  }
}
