import { GuestBook, GuestMessage, DashboardStats, Media, User } from '../types.ts';

const TOKEN_KEY = 'gb_auth_token';
const VISITOR_ID_KEY = 'gb_visitor_id';

export function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = `vis_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const visitorId = getVisitorId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-visitor-id': visitorId,
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  auth: {
    async login(email: string, password: string):Promise<{ token: string; user: User }> {
      const res = await request<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setToken(res.token);
      return res;
    },
    async register(email: string, password: string, name: string): Promise<{ token: string; user: User }> {
      const res = await request<{ token: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name })
      });
      setToken(res.token);
      return res;
    },
    async demoLogin(): Promise<{ token: string; user: User }> {
      const res = await request<{ token: string; user: User }>('/api/auth/demo', {
        method: 'POST'
      });
      setToken(res.token);
      return res;
    },
    async me(): Promise<{ user: User }> {
      return request<{ user: User }>('/api/auth/me');
    },
    logout() {
      setToken(null);
    }
  },

  guestBooks: {
    async list(): Promise<GuestBook[]> {
      return request<GuestBook[]>('/api/guestbooks');
    },
    async get(id: string): Promise<GuestBook> {
      return request<GuestBook>(`/api/guestbooks/${id}`);
    },
    async getBySlug(slug: string, password?: string): Promise<{ guestBook: GuestBook; messages: GuestMessage[]; isOwner: boolean }> {
      const headers: Record<string, string> = {};
      if (password) {
        headers['x-guestbook-password'] = password;
      }
      return request<{ guestBook: GuestBook; messages: GuestMessage[]; isOwner: boolean }>(
        `/api/public/guestbooks/${slug}`,
        { headers }
      );
    },
    async verifyPassword(slug: string, password: string): Promise<{ valid: boolean }> {
      return request<{ valid: boolean }>(`/api/public/guestbooks/${slug}/verify-password`, {
        method: 'POST',
        body: JSON.stringify({ password })
      });
    },
    async create(data: Partial<GuestBook>): Promise<GuestBook> {
      return request<GuestBook>('/api/guestbooks', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    async update(id: string, updates: Partial<GuestBook>): Promise<GuestBook> {
      return request<GuestBook>(`/api/guestbooks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    },
    async delete(id: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/api/guestbooks/${id}`, {
        method: 'DELETE'
      });
    },
    async getStats(id: string): Promise<DashboardStats> {
      return request<DashboardStats>(`/api/admin/guestbooks/${id}/stats`);
    },
    async getMedia(id: string): Promise<(Media & { guestName: string; messageDate: string })[]> {
      return request<(Media & { guestName: string; messageDate: string })[]>(`/api/admin/guestbooks/${id}/media`);
    }
  },

  messages: {
    async listAdmin(
      guestBookId: string,
      params: { status?: string; search?: string; sort?: string; hasPhoto?: boolean; hasVideo?: boolean } = {}
    ): Promise<GuestMessage[]> {
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.search) query.set('search', params.search);
      if (params.sort) query.set('sort', params.sort);
      if (params.hasPhoto) query.set('hasPhoto', 'true');
      if (params.hasVideo) query.set('hasVideo', 'true');

      return request<GuestMessage[]>(`/api/admin/guestbooks/${guestBookId}/messages?${query.toString()}`);
    },
    async submit(
      slug: string,
      data: {
        name: string;
        email?: string;
        message: string;
        relationship?: string;
        mediaUrls?: { type: 'IMAGE' | 'VIDEO'; url: string }[];
        reactionType?: string;
      }
    ): Promise<{ message: GuestMessage; isModerated: boolean; successNotice: string }> {
      return request<{ message: GuestMessage; isModerated: boolean; successNotice: string }>(
        `/api/public/guestbooks/${slug}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );
    },
    async updateStatus(messageId: string, status: 'APPROVED' | 'PENDING' | 'HIDDEN'): Promise<{ success: boolean; status: string }> {
      return request<{ success: boolean; status: string }>(`/api/admin/messages/${messageId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },
    async delete(messageId: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/api/admin/messages/${messageId}`, {
        method: 'DELETE'
      });
    },
    async toggleReaction(messageId: string, reactionType: string): Promise<{ added: boolean; count: number }> {
      return request<{ added: boolean; count: number }>(`/api/public/messages/${messageId}/reaction`, {
        method: 'POST',
        body: JSON.stringify({ reactionType })
      });
    }
  },

  qrcode: {
    async getPng(url: string): Promise<string> {
      const data = await request<{ dataUrl: string }>(`/api/qrcode?text=${encodeURIComponent(url)}&format=png`);
      return data.dataUrl;
    },
    getSvgUrl(url: string): string {
      return `/api/qrcode?text=${encodeURIComponent(url)}&format=svg`;
    }
  },

  upload: {
    async uploadMedia(dataUrl: string, type: 'IMAGE' | 'VIDEO' = 'IMAGE'): Promise<{ url: string; type: string }> {
      return request<{ url: string; type: string }>('/api/upload', {
        method: 'POST',
        body: JSON.stringify({ dataUrl, type })
      });
    }
  }
};
