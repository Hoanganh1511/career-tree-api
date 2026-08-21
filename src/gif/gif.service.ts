import { Injectable, ServiceUnavailableException } from '@nestjs/common';

interface GiphyImage {
  id: string;
  title: string;
  images: {
    original?: { url: string };
    fixed_width_small?: { url: string };
    fixed_width?: { url: string };
  };
}

interface GiphyResponse {
  data: GiphyImage[];
}

export interface ApiGif {
  id: string;
  title: string;
  previewUrl: string | null;
  url: string | null;
}

// Proxy tim GIF qua Giphy - API key nam o backend (GIPHY_API_KEY trong .env),
// KHONG lo ra frontend. Chua co key -> 503, FE hien "Sap co" thay vi loi vo
// nghia (xem cac cho khac trong session dung cung quy uoc voi UploadService).
@Injectable()
export class GifService {
  private apiKey = process.env.GIPHY_API_KEY;

  get isConfigured() {
    return Boolean(this.apiKey);
  }

  search(query: string, limit = 24): Promise<ApiGif[]> {
    return this.call('search', { q: query, limit: String(limit) });
  }

  trending(limit = 24): Promise<ApiGif[]> {
    return this.call('trending', { limit: String(limit) });
  }

  private async call(
    endpoint: 'search' | 'trending',
    params: Record<string, string>,
  ): Promise<ApiGif[]> {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException('Chưa cấu hình GIPHY_API_KEY');
    }

    const url = new URL(`https://api.giphy.com/v1/gifs/${endpoint}`);
    url.searchParams.set('api_key', this.apiKey!);
    url.searchParams.set('rating', 'pg-13');
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new ServiceUnavailableException('Giphy API lỗi, thử lại sau');
    }
    const body = (await res.json()) as GiphyResponse;

    return body.data.map((g) => ({
      id: g.id,
      title: g.title,
      previewUrl:
        g.images.fixed_width_small?.url ?? g.images.fixed_width?.url ?? null,
      url: g.images.original?.url ?? null,
    }));
  }
}
