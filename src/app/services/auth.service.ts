import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { LoginDetails, Reader, RegistrationDetails } from "../models/reader";

interface AuthResponse {
  user: Reader;
}

interface SessionResponse {
  user: Reader | null;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly currentUser = signal<Reader | null>(null);

  async restoreSession(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<SessionResponse>("/api/me"));
      this.currentUser.set(response.user);
    } catch (error) {
      throw error;
    }
  }

  async register(details: RegistrationDetails): Promise<Reader> {
    const response = await firstValueFrom(this.http.post<AuthResponse>("/api/register", details));
    this.currentUser.set(response.user);
    return response.user;
  }

  async login(details: LoginDetails): Promise<Reader> {
    const response = await firstValueFrom(this.http.post<AuthResponse>("/api/login", details));
    this.currentUser.set(response.user);
    return response.user;
  }

  async updateGenre(genre: string): Promise<Reader> {
    const response = await firstValueFrom(this.http.put<AuthResponse>("/api/profile", { genre }));
    this.currentUser.set(response.user);
    return response.user;
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post("/api/logout", {}));
    this.currentUser.set(null);
  }
}
