import { Book } from "../models/book";
import { Reader } from "../models/reader";

export class BookRecommendationEngine {
  recommend(books: readonly Book[], reader: Pick<Reader, "genre"> | null, query = ""): Book[] {
    const search = query.trim().toLocaleLowerCase();
    return books.filter((book) => {
      const matchesGenre = !reader?.genre || book.genre === reader.genre;
      const searchableText = `${book.title} ${book.author} ${book.genre}`.toLocaleLowerCase();
      return matchesGenre && searchableText.includes(search);
    });
  }
}
