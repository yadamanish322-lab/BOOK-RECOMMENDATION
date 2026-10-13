export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  description: string;
  averageRating?: number;
  coverUrl?: string;
  openLibraryUrl?: string;
  firstPublishedYear?: number;
}

export interface LiveBookSearch {
  books: Book[];
  total: number;
  page: number;
  limit: number;
}

export interface BookSuggestion {
  reader: string;
  title: string;
  author: string;
  genre: string;
}

export interface SubmittedSuggestion extends BookSuggestion {
  id: string;
  submittedAt: string;
}
